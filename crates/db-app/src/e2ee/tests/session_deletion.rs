use super::*;

async fn seed(pool: &SqlitePool) {
    sqlx::raw_sql(
        "INSERT INTO sessions (id, workspace_id, title) VALUES ('meeting', 'workspace-a', 'Standup');
         INSERT INTO session_documents (id, workspace_id, session_id)
           VALUES ('meeting', 'workspace-a', 'meeting');",
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn delete(pool: &SqlitePool, tombstone: &str) {
    let mut tx = pool.begin().await.unwrap();
    for table in ["session_documents", "transcripts", "session_attachments"] {
        let sql = format!(
            "UPDATE {table} SET deleted_at = ?, updated_at = ?
             WHERE session_id = 'meeting' AND deleted_at IS NULL"
        );
        sqlx::query(sqlx::AssertSqlSafe(sql))
            .bind(tombstone)
            .bind(tombstone)
            .execute(&mut *tx)
            .await
            .unwrap();
    }
    sqlx::query("UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = 'meeting'")
        .bind(tombstone)
        .bind(tombstone)
        .execute(&mut *tx)
        .await
        .unwrap();
    tx.commit().await.unwrap();
}

async fn sync(source: &SqlitePool, target: &SqlitePool) {
    let workspace_keys = keys("workspace-a");
    encrypt_e2ee_replica_changes(source, &workspace_keys)
        .await
        .unwrap();
    copy_replica(source, target).await;
    for _ in 0..12 {
        encrypt_e2ee_replica_changes(target, &workspace_keys)
            .await
            .unwrap();
        let stats = apply_e2ee_replica_changes(target, &workspace_keys)
            .await
            .unwrap();
        if !stats.remaining_replica_changes {
            return;
        }
    }
    panic!("replica did not settle");
}

async fn assert_deleted(pool: &SqlitePool, deleted: bool) {
    let actual: bool =
        sqlx::query_scalar("SELECT deleted_at IS NOT NULL FROM sessions WHERE id = 'meeting'")
            .fetch_one(pool)
            .await
            .unwrap();
    assert_eq!(actual, deleted);
}

#[tokio::test]
async fn unseen_recording_survives_stale_deletion_in_both_sync_orders() {
    for delete_arrives_first in [true, false] {
        let a = test_db().await;
        let b = test_db().await;
        seed(a.pool()).await;
        sync(a.pool(), b.pool()).await;
        sqlx::query(
            "INSERT INTO transcripts (id, workspace_id, session_id, words_json)
            VALUES ('capture-b', 'workspace-a', 'meeting', '[{\"text\":\"Useful meeting\"}]')",
        )
        .execute(b.pool())
        .await
        .unwrap();
        delete(a.pool(), "2099-01-01").await;
        if delete_arrives_first {
            sync(a.pool(), b.pool()).await;
        } else {
            sync(b.pool(), a.pool()).await;
        }
        for _ in 0..3 {
            sync(a.pool(), b.pool()).await;
            sync(b.pool(), a.pool()).await;
        }
        for db in [&a, &b] {
            assert_deleted(db.pool(), false).await;
            let words: String = sqlx::query_scalar(
                "SELECT words_json FROM transcripts WHERE id = 'capture-b' AND deleted_at IS NULL",
            )
            .fetch_one(db.pool())
            .await
            .unwrap();
            assert!(words.contains("Useful meeting"));
        }
        // Once the populated note has been seen, intentional deletion must stick.
        delete(a.pool(), "2100-01-01").await;
        sync(a.pool(), b.pool()).await;
        sync(b.pool(), a.pool()).await;
        assert_deleted(a.pool(), true).await;
        assert_deleted(b.pool(), true).await;
        let fresh = test_db().await;
        sync(a.pool(), fresh.pool()).await;
        assert_deleted(fresh.pool(), true).await;
    }
}

#[tokio::test]
async fn unseen_note_edits_and_audio_without_transcription_survive() {
    for change in [
        "UPDATE session_documents SET body_format = 'markdown', body = 'User notes' WHERE id = 'meeting'",
        "INSERT INTO session_attachments (id, workspace_id, session_id, size_bytes, sha256)
         VALUES ('audio-b', 'workspace-a', 'meeting', 1234, 'recorded-on-mobile')",
    ] {
        let a = test_db().await;
        let b = test_db().await;
        seed(a.pool()).await;
        sync(a.pool(), b.pool()).await;
        sqlx::raw_sql(sqlx::AssertSqlSafe(change))
            .execute(b.pool())
            .await
            .unwrap();
        delete(a.pool(), "2099-01-01").await;
        sync(a.pool(), b.pool()).await;
        sync(b.pool(), a.pool()).await;
        assert_deleted(a.pool(), false).await;
        assert_deleted(b.pool(), false).await;
    }
}

#[tokio::test]
async fn empty_rows_and_metadata_do_not_resurrect_a_deleted_note() {
    let a = test_db().await;
    let b = test_db().await;
    seed(a.pool()).await;
    sync(a.pool(), b.pool()).await;
    sqlx::raw_sql("INSERT INTO transcripts (id, workspace_id, session_id) VALUES ('empty', 'workspace-a', 'meeting');
        UPDATE sessions SET ended_at = '2099-02-01' WHERE id = 'meeting';
        UPDATE session_documents SET body = '{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}' WHERE id = 'meeting';")
        .execute(b.pool()).await.unwrap();
    delete(a.pool(), "2099-01-01").await;
    sync(a.pool(), b.pool()).await;
    sync(b.pool(), a.pool()).await;
    assert_deleted(a.pool(), true).await;
    assert_deleted(b.pool(), true).await;
}

#[tokio::test]
async fn local_undo_clears_the_deletion_observation() {
    let a = test_db().await;
    let b = test_db().await;
    seed(a.pool()).await;
    delete(a.pool(), "2099-01-01").await;
    sync(a.pool(), b.pool()).await;
    sqlx::query("UPDATE sessions SET deleted_at = NULL WHERE id = 'meeting'")
        .execute(a.pool())
        .await
        .unwrap();
    sync(a.pool(), b.pool()).await;
    assert_deleted(b.pool(), false).await;
}

#[tokio::test]
async fn replacement_audio_survives_deletion_of_the_older_recording() {
    let a = test_db().await;
    let b = test_db().await;
    seed(a.pool()).await;
    sqlx::query(
        "INSERT INTO session_attachments (id, workspace_id, session_id, size_bytes, sha256)
        VALUES ('session-audio:meeting', 'workspace-a', 'meeting', 100, 'empty-device-a')",
    )
    .execute(a.pool())
    .await
    .unwrap();
    sync(a.pool(), b.pool()).await;
    sqlx::query(
        "UPDATE session_attachments SET size_bytes = 12345, sha256 = 'useful-device-b'
        WHERE id = 'session-audio:meeting'",
    )
    .execute(b.pool())
    .await
    .unwrap();
    delete(a.pool(), "2099-01-01").await;
    let context: String =
        sqlx::query_scalar("SELECT deletion_context FROM sessions WHERE id = 'meeting'")
            .fetch_one(a.pool())
            .await
            .unwrap();
    let context: serde_json::Value = serde_json::from_str(&context).unwrap();
    assert_eq!(
        context["observed"]["attachment:session-audio:meeting"],
        serde_json::json!("[\"empty-device-a\",100,\"\",\"\",\"\"]")
    );
    sync(a.pool(), b.pool()).await;
    sync(b.pool(), a.pool()).await;
    for db in [&a, &b] {
        assert_deleted(db.pool(), false).await;
        let hash: String = sqlx::query_scalar(
            "SELECT sha256 FROM session_attachments
            WHERE id = 'session-audio:meeting' AND deleted_at IS NULL",
        )
        .fetch_one(db.pool())
        .await
        .unwrap();
        assert_eq!(hash, "useful-device-b");
    }
    delete(a.pool(), "2100-01-01").await;
    sync(a.pool(), b.pool()).await;
    sync(b.pool(), a.pool()).await;
    assert_deleted(a.pool(), true).await;
    assert_deleted(b.pool(), true).await;
    let fresh = test_db().await;
    sync(a.pool(), fresh.pool()).await;
    assert_deleted(fresh.pool(), true).await;
}

#[tokio::test]
async fn recording_arriving_after_the_deleted_parent_restores_the_note() {
    let a = test_db().await;
    let b = test_db().await;
    let fresh = test_db().await;
    seed(a.pool()).await;
    sync(a.pool(), b.pool()).await;
    delete(a.pool(), "2099-01-01").await;
    sync(a.pool(), fresh.pool()).await;
    assert_deleted(fresh.pool(), true).await;
    sqlx::query(
        "INSERT INTO transcripts (id, workspace_id, session_id, words_json)
        VALUES ('late', 'workspace-a', 'meeting', '[{\"text\":\"Late offline recording\"}]')",
    )
    .execute(b.pool())
    .await
    .unwrap();
    sync(b.pool(), fresh.pool()).await;
    assert_deleted(fresh.pool(), false).await;
    sync(fresh.pool(), a.pool()).await;
    assert_deleted(a.pool(), false).await;
}

#[tokio::test]
async fn late_related_tombstones_follow_the_restored_note() {
    let db = test_db().await;
    seed(db.pool()).await;
    delete(db.pool(), "2099-01-01").await;
    sqlx::query(
        "INSERT INTO transcripts (id, workspace_id, session_id, words_json)
        VALUES ('late', 'workspace-a', 'meeting', '[{\"text\":\"Offline recording\"}]')",
    )
    .execute(db.pool())
    .await
    .unwrap();
    for (table, insert) in [
        (
            "session_tags",
            "INSERT INTO session_tags (id, workspace_id, session_id, deleted_at)
         VALUES ('related', 'workspace-a', 'meeting', '2099-01-01')",
        ),
        (
            "entity_mentions",
            "INSERT INTO entity_mentions (id, workspace_id, target_type, target_id, deleted_at)
         VALUES ('related', 'workspace-a', 'session', 'meeting', '2099-01-01')",
        ),
    ] {
        let mut tx = db.pool().begin().await.unwrap();
        sqlx::raw_sql(sqlx::AssertSqlSafe(insert))
            .execute(&mut *tx)
            .await
            .unwrap();
        crate::session_deletion::reconcile_session_deletion(
            &mut tx,
            "workspace-a",
            table,
            "related",
        )
        .await
        .unwrap();
        tx.commit().await.unwrap();
        let live: bool = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
            "SELECT deleted_at IS NULL FROM {table} WHERE id = 'related'"
        )))
        .fetch_one(db.pool())
        .await
        .unwrap();
        assert!(live);
    }
    assert_deleted(db.pool(), false).await;
}

#[tokio::test]
async fn upgrade_preserves_existing_content_and_legacy_deletions() {
    let db = anlg_db_core::Db::connect_memory_plain().await.unwrap();
    let index = crate::APP_MIGRATION_STEPS
        .iter()
        .position(|step| step.id == "20260907120000_session_documents_content_version")
        .unwrap();
    anlg_db_migrate::migrate(
        &db,
        anlg_db_migrate::DbSchema {
            steps: &crate::APP_MIGRATION_STEPS[..index],
            validate_cloudsync_table: crate::cloudsync_alter_guard_required,
        },
    )
    .await
    .unwrap();
    seed(db.pool()).await;
    sqlx::raw_sql("UPDATE session_documents SET body_format = 'markdown', body = 'Existing note';
        INSERT INTO sessions (id, workspace_id, deleted_at) VALUES ('legacy-deleted', 'workspace-a', 'old');")
        .execute(db.pool()).await.unwrap();
    crate::prepare_schema(&db).await.unwrap();
    let content: (String, String) =
        sqlx::query_as("SELECT body, content_version FROM session_documents WHERE id = 'meeting'")
            .fetch_one(db.pool())
            .await
            .unwrap();
    assert_eq!(content, ("Existing note".into(), "".into()));
    let legacy: (String, String) = sqlx::query_as(
        "SELECT deleted_at, deletion_context FROM sessions WHERE id = 'legacy-deleted'",
    )
    .fetch_one(db.pool())
    .await
    .unwrap();
    assert_eq!(legacy, ("old".into(), "".into()));
    delete(db.pool(), "2099-01-01").await;
    let fresh = test_db().await;
    sync(db.pool(), fresh.pool()).await;
    assert_deleted(fresh.pool(), true).await;
}
