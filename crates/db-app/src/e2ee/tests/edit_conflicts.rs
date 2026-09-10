use super::*;

// A fixed morning well in the past so real write times always land after it.
const EIGHT_AM: i64 = 1_700_000_000_000;
const NINE_AM: i64 = EIGHT_AM + 3_600_000;
const TEN_AM: i64 = NINE_AM + 3_600_000;

async fn seed_base_session(
    workspace_keys: &HashMap<String, anlg_e2ee::WorkspaceKeyring>,
) -> (anlg_db_core::Db, anlg_db_core::Db) {
    let a = test_db().await;
    let b = test_db().await;
    sqlx::query(
        "INSERT INTO sessions (id, workspace_id, owner_user_id, title)
         VALUES ('session-1', 'workspace-a', 'user-a', 'Base')",
    )
    .execute(a.pool())
    .await
    .unwrap();
    encrypt_e2ee_replica_changes(a.pool(), workspace_keys)
        .await
        .unwrap();
    copy_replica(a.pool(), b.pool()).await;
    apply_e2ee_replica_changes(b.pool(), workspace_keys)
        .await
        .unwrap();
    assert_eq!(title(&b).await, "Base");
    (a, b)
}

async fn edit_title(db: &anlg_db_core::Db, title: &str, edited_at_ms: i64) {
    sqlx::query("UPDATE sessions SET title = ? WHERE id = 'session-1'")
        .bind(title)
        .execute(db.pool())
        .await
        .unwrap();
    sqlx::query("UPDATE e2ee_dirty_rows SET dirtied_at_ms = ? WHERE row_id = 'session-1'")
        .bind(edited_at_ms)
        .execute(db.pool())
        .await
        .unwrap();
}

async fn title(db: &anlg_db_core::Db) -> String {
    sqlx::query_scalar("SELECT title FROM sessions WHERE id = 'session-1'")
        .fetch_one(db.pool())
        .await
        .unwrap()
}

async fn title_revision(
    db: &anlg_db_core::Db,
    workspace_keys: &HashMap<String, anlg_e2ee::WorkspaceKeyring>,
) -> (u64, Value, Option<u64>) {
    let key = &workspace_keys["workspace-a"];
    let record_id = key.blind_field_id("sessions", "session-1", "title");
    let payload: String = sqlx::query_scalar("SELECT payload FROM e2ee_records WHERE id = ?")
        .bind(&record_id)
        .fetch_one(db.pool())
        .await
        .unwrap();
    let field = key.open_field("workspace-a", &record_id, &payload).unwrap();
    (field.revision, field.value, field.edited_at_ms)
}

#[tokio::test]
async fn later_edit_wins_even_when_the_earlier_edit_published_first() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_base_session(&workspace_keys).await;

    // B edits first but publishes second; A edits later and publishes first.
    edit_title(&b, "From B", EIGHT_AM).await;
    encrypt_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    edit_title(&a, "From A", NINE_AM).await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();

    copy_replica(b.pool(), a.pool()).await;
    let stats = apply_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(title(&a).await, "From A");
    assert_eq!(stats.recorded_conflicts, 1);
    let conflicts = list_e2ee_field_conflicts(a.pool(), "sessions", "session-1", false)
        .await
        .unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].lost_side, "remote");
    assert_eq!(conflicts[0].field_name, "title");
    assert_eq!(conflicts[0].value_json, "\"From B\"");
    assert_eq!(conflicts[0].edited_at_ms, Some(EIGHT_AM));

    // A republishes its later edit above B's revision with the original edit time.
    let stats = encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    assert!(stats.encrypted_fields >= 1);
    let (revision, value, edited_at_ms) = title_revision(&a, &workspace_keys).await;
    assert_eq!(value, json!("From A"));
    assert_eq!(edited_at_ms, Some(NINE_AM as u64));
    assert!(revision >= 3, "republished revision was {revision}");

    copy_replica(a.pool(), b.pool()).await;
    apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(title(&b).await, "From A");

    // Nothing left to ping-pong.
    let stats = apply_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(stats.recorded_conflicts, 0);
}

#[tokio::test]
async fn earlier_unsent_edit_yields_to_a_later_remote_edit_and_keeps_a_copy() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_base_session(&workspace_keys).await;

    edit_title(&b, "From B", EIGHT_AM).await;
    edit_title(&a, "From A", NINE_AM).await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();

    copy_replica(a.pool(), b.pool()).await;
    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(title(&b).await, "From A");
    assert_eq!(stats.recorded_conflicts, 1);
    assert_eq!(stats.skipped_local_changes, 0);
    let conflicts = list_e2ee_field_conflicts(b.pool(), "sessions", "session-1", false)
        .await
        .unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].lost_side, "local");
    assert_eq!(conflicts[0].value_json, "\"From B\"");
    assert_eq!(conflicts[0].edited_at_ms, Some(EIGHT_AM));

    // The overwritten local edit is not pushed back out.
    encrypt_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    let (_, value, _) = title_revision(&b, &workspace_keys).await;
    assert_eq!(value, json!("From A"));

    // Restoring the copy makes it a fresh local edit that syncs normally.
    assert!(
        restore_e2ee_field_conflict(b.pool(), &conflicts[0].id)
            .await
            .unwrap()
    );
    assert_eq!(title(&b).await, "From B");
    assert!(
        list_e2ee_field_conflicts(b.pool(), "sessions", "session-1", false)
            .await
            .unwrap()
            .is_empty()
    );
    let stats = encrypt_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    assert!(stats.encrypted_fields >= 1);
    let (revision, value, edited_at_ms) = title_revision(&b, &workspace_keys).await;
    assert_eq!(value, json!("From B"));
    assert!(revision >= 3);
    assert!(edited_at_ms.is_some_and(|ms| ms > NINE_AM as u64));
    copy_replica(b.pool(), a.pool()).await;
    apply_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(title(&a).await, "From B");
}

#[tokio::test]
async fn later_unsent_edit_keeps_winning_and_records_the_remote_copy_once() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_base_session(&workspace_keys).await;

    edit_title(&a, "From A", NINE_AM).await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    edit_title(&b, "From B", TEN_AM).await;

    copy_replica(a.pool(), b.pool()).await;
    let first = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    let second = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(title(&b).await, "From B");
    assert_eq!(first.recorded_conflicts, 1);
    assert_eq!(first.skipped_local_changes, 1);
    assert_eq!(second.recorded_conflicts, 0);
    let conflicts = list_e2ee_field_conflicts(b.pool(), "sessions", "session-1", false)
        .await
        .unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].lost_side, "remote");
    assert_eq!(conflicts[0].value_json, "\"From A\"");

    encrypt_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    copy_replica(b.pool(), a.pool()).await;
    apply_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(title(&a).await, "From B");
    assert_eq!(
        unresolved_e2ee_field_conflict_count(a.pool())
            .await
            .unwrap(),
        0
    );
    assert!(
        resolve_e2ee_field_conflict(b.pool(), &conflicts[0].id)
            .await
            .unwrap()
    );
    assert_eq!(
        unresolved_e2ee_field_conflict_count(b.pool())
            .await
            .unwrap(),
        0
    );
}

#[tokio::test]
async fn records_without_edit_times_keep_the_local_change_as_before() {
    let workspace_keys = keys("workspace-a");
    let key = &workspace_keys["workspace-a"];
    let (a, b) = seed_base_session(&workspace_keys).await;
    edit_title(&b, "From B", EIGHT_AM).await;

    // A legacy client seals fields without an edit time.
    let legacy = key
        .seal_field(
            "workspace-a",
            "sessions",
            "session-1",
            "title",
            "ffffffffffffffffffffffffffffffff",
            2,
            false,
            json!("Legacy"),
        )
        .unwrap();
    sqlx::query("UPDATE e2ee_records SET payload = ? WHERE id = ?")
        .bind(&legacy.payload)
        .bind(&legacy.record_id)
        .execute(a.pool())
        .await
        .unwrap();
    copy_replica(a.pool(), b.pool()).await;

    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(title(&b).await, "From B");
    assert_eq!(stats.skipped_local_changes, 1);
    let conflicts = list_e2ee_field_conflicts(b.pool(), "sessions", "session-1", false)
        .await
        .unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].value_json, "\"Legacy\"");
    assert_eq!(conflicts[0].edited_at_ms, None);
}
