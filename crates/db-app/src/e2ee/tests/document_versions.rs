use super::*;

async fn insert_note(db: &anlg_db_core::Db, body: &str) {
    sqlx::query(
        "INSERT INTO sessions (id, workspace_id, owner_user_id, title)
         VALUES ('session-1', 'workspace-a', 'user-a', 'Note')",
    )
    .execute(db.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO session_documents (id, workspace_id, session_id, kind, body)
         VALUES ('doc-1', 'workspace-a', 'session-1', 'note', ?)",
    )
    .bind(body)
    .execute(db.pool())
    .await
    .unwrap();
}

async fn set_body(db: &anlg_db_core::Db, body: &str) {
    sqlx::query("UPDATE session_documents SET body = ? WHERE id = 'doc-1'")
        .bind(body)
        .execute(db.pool())
        .await
        .unwrap();
}

async fn versions(db: &anlg_db_core::Db) -> Vec<(String, String)> {
    sqlx::query_as(
        "SELECT body, source FROM session_document_versions
         WHERE document_id = 'doc-1' ORDER BY created_at, id",
    )
    .fetch_all(db.pool())
    .await
    .unwrap()
}

#[tokio::test]
async fn local_edits_keep_one_version_per_editing_session() {
    let db = test_db().await;
    insert_note(&db, "first").await;

    set_body(&db, "second").await;
    set_body(&db, "third").await;

    assert_eq!(
        versions(&db).await,
        vec![("first".to_string(), "local".to_string())]
    );

    // An editing session that started more than ten minutes ago gets a new snapshot.
    sqlx::query(
        "UPDATE session_document_versions
         SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-11 minutes')",
    )
    .execute(db.pool())
    .await
    .unwrap();
    set_body(&db, "fourth").await;
    assert_eq!(
        versions(&db).await,
        vec![
            ("first".to_string(), "local".to_string()),
            ("third".to_string(), "local".to_string()),
        ]
    );
}

#[tokio::test]
async fn synced_edits_always_snapshot_the_replaced_body() {
    let workspace_keys = keys("workspace-a");
    let source = test_db().await;
    insert_note(&source, "from desktop").await;
    encrypt_e2ee_replica_changes(source.pool(), &workspace_keys)
        .await
        .unwrap();

    let target = test_db().await;
    insert_note(&target, "on phone").await;
    // Take the phone's own note out of the "just edited" window so the replaced
    // body is attributed to sync, not coalesced into a local session.
    sqlx::query("DELETE FROM e2ee_dirty_rows")
        .execute(target.pool())
        .await
        .unwrap();
    copy_replica(source.pool(), target.pool()).await;
    apply_e2ee_replica_changes(target.pool(), &workspace_keys)
        .await
        .unwrap();

    let body: String = sqlx::query_scalar("SELECT body FROM session_documents WHERE id = 'doc-1'")
        .fetch_one(target.pool())
        .await
        .unwrap();
    assert_eq!(body, "from desktop");
    assert_eq!(
        versions(&target).await,
        vec![("on phone".to_string(), "sync".to_string())]
    );
}

#[tokio::test]
async fn history_is_capped_per_document() {
    let db = test_db().await;
    insert_note(&db, "v0").await;
    for index in 1..=60 {
        sqlx::query(
            "UPDATE session_document_versions
             SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '-1 hour')",
        )
        .execute(db.pool())
        .await
        .unwrap();
        set_body(&db, &format!("v{index}")).await;
    }
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM session_document_versions WHERE document_id = 'doc-1'",
    )
    .fetch_one(db.pool())
    .await
    .unwrap();
    assert_eq!(count, 50);
    let oldest: String = sqlx::query_scalar(
        "SELECT body FROM session_document_versions WHERE document_id = 'doc-1'
         ORDER BY created_at, id LIMIT 1",
    )
    .fetch_one(db.pool())
    .await
    .unwrap();
    assert_eq!(oldest, "v10");
}
