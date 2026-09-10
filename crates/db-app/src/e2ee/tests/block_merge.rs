use super::*;

const EIGHT_AM: i64 = 1_700_000_000_000;
const NINE_AM: i64 = EIGHT_AM + 3_600_000;

fn paragraph(text: &str) -> Value {
    json!({ "type": "paragraph", "content": [{ "type": "text", "text": text }] })
}

fn body(paragraphs: &[&str]) -> String {
    json!({ "type": "doc", "content": paragraphs.iter().map(|text| paragraph(text)).collect::<Vec<_>>() })
        .to_string()
}

fn paragraphs(body: &str) -> Vec<String> {
    let doc: Value = serde_json::from_str(body).unwrap();
    doc["content"]
        .as_array()
        .unwrap()
        .iter()
        .map(|block| block["content"][0]["text"].as_str().unwrap().to_string())
        .collect()
}

async fn seed_note(
    workspace_keys: &HashMap<String, anlg_e2ee::WorkspaceKeyring>,
    body_format: &str,
    body: &str,
) -> (anlg_db_core::Db, anlg_db_core::Db) {
    let a = test_db().await;
    let b = test_db().await;
    sqlx::query(
        "INSERT INTO sessions (id, workspace_id, owner_user_id, title)
         VALUES ('session-1', 'workspace-a', 'user-a', 'Note')",
    )
    .execute(a.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO session_documents (id, workspace_id, session_id, kind, body_format, body)
         VALUES ('session-1', 'workspace-a', 'session-1', 'note', ?, ?)",
    )
    .bind(body_format)
    .bind(body)
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
    assert_eq!(read_body(&b).await, body);
    (a, b)
}

async fn edit_body(db: &anlg_db_core::Db, body: &str, edited_at_ms: i64) {
    sqlx::query("UPDATE session_documents SET body = ? WHERE id = 'session-1'")
        .bind(body)
        .execute(db.pool())
        .await
        .unwrap();
    sqlx::query(
        "UPDATE e2ee_dirty_rows SET dirtied_at_ms = ?
         WHERE table_name = 'session_documents' AND row_id = 'session-1'",
    )
    .bind(edited_at_ms)
    .execute(db.pool())
    .await
    .unwrap();
}

async fn read_body(db: &anlg_db_core::Db) -> String {
    sqlx::query_scalar("SELECT body FROM session_documents WHERE id = 'session-1'")
        .fetch_one(db.pool())
        .await
        .unwrap()
}

#[tokio::test]
async fn concurrent_edits_to_different_paragraphs_merge_on_both_devices() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_note(
        &workspace_keys,
        "prosemirror_json",
        &body(&["intro", "details"]),
    )
    .await;

    edit_body(&b, &body(&["intro from phone", "details"]), EIGHT_AM).await;
    edit_body(&a, &body(&["intro", "details from desktop"]), NINE_AM).await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();

    copy_replica(a.pool(), b.pool()).await;
    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(stats.merged_fields, 1);
    assert_eq!(stats.recorded_conflicts, 0);
    assert_eq!(stats.skipped_local_changes, 0);
    assert_eq!(
        paragraphs(&read_body(&b).await),
        vec!["intro from phone", "details from desktop"]
    );
    assert!(
        list_e2ee_field_conflicts(b.pool(), "session_documents", "session-1", false)
            .await
            .unwrap()
            .is_empty()
    );

    // The merged note publishes and the other device picks it up as-is.
    let stats = encrypt_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    assert!(stats.encrypted_fields >= 1);
    copy_replica(b.pool(), a.pool()).await;
    let stats = apply_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(stats.recorded_conflicts, 0);
    assert_eq!(
        paragraphs(&read_body(&a).await),
        vec!["intro from phone", "details from desktop"]
    );
    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(stats.merged_fields, 0);
}

#[tokio::test]
async fn the_same_paragraph_edited_on_both_sides_keeps_the_later_edit_and_a_copy() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_note(
        &workspace_keys,
        "prosemirror_json",
        &body(&["intro", "details"]),
    )
    .await;

    edit_body(
        &b,
        &body(&["intro rewritten on phone", "details"]),
        EIGHT_AM,
    )
    .await;
    edit_body(
        &a,
        &body(&["intro rewritten on desktop", "details", "added on desktop"]),
        NINE_AM,
    )
    .await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();

    copy_replica(a.pool(), b.pool()).await;
    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(stats.merged_fields, 1);
    assert_eq!(stats.recorded_conflicts, 1);
    assert_eq!(
        paragraphs(&read_body(&b).await),
        vec!["intro rewritten on desktop", "details", "added on desktop"]
    );
    let conflicts = list_e2ee_field_conflicts(b.pool(), "session_documents", "session-1", false)
        .await
        .unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].lost_side, "local");
    let lost: String = serde_json::from_str(&conflicts[0].value_json).unwrap();
    assert_eq!(
        paragraphs(&lost),
        vec!["intro rewritten on phone", "details"]
    );
}

#[tokio::test]
async fn a_later_unsent_edit_merges_with_the_earlier_remote_edit_and_keeps_it() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_note(
        &workspace_keys,
        "prosemirror_json",
        &body(&["one", "two", "three"]),
    )
    .await;

    edit_body(&a, &body(&["one", "two", "three from desktop"]), EIGHT_AM).await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    edit_body(&b, &body(&["one from phone", "two", "three"]), NINE_AM).await;

    copy_replica(a.pool(), b.pool()).await;
    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(stats.merged_fields, 1);
    assert_eq!(stats.recorded_conflicts, 0);
    assert_eq!(
        paragraphs(&read_body(&b).await),
        vec!["one from phone", "two", "three from desktop"]
    );
    encrypt_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();
    copy_replica(b.pool(), a.pool()).await;
    apply_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();
    assert_eq!(
        paragraphs(&read_body(&a).await),
        vec!["one from phone", "two", "three from desktop"]
    );
}

#[tokio::test]
async fn markdown_bodies_fall_back_to_whole_value_ordering() {
    let workspace_keys = keys("workspace-a");
    let (a, b) = seed_note(&workspace_keys, "markdown", "# Notes\n\nbase").await;

    edit_body(&b, "# Notes\n\nphone", EIGHT_AM).await;
    edit_body(&a, "# Notes\n\ndesktop", NINE_AM).await;
    encrypt_e2ee_replica_changes(a.pool(), &workspace_keys)
        .await
        .unwrap();

    copy_replica(a.pool(), b.pool()).await;
    let stats = apply_e2ee_replica_changes(b.pool(), &workspace_keys)
        .await
        .unwrap();

    assert_eq!(stats.merged_fields, 0);
    assert_eq!(stats.recorded_conflicts, 1);
    assert_eq!(read_body(&b).await, "# Notes\n\ndesktop");
}
