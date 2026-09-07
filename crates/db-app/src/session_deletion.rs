use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;
use sqlx::{Sqlite, Transaction};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeletionContext {
    version: u32,
    deleted_at: String,
    observed: BTreeMap<String, Value>,
}

fn observed_content_version(value: Option<&Value>) -> Option<String> {
    match value {
        Some(Value::String(value)) => Some(value.clone()),
        Some(value) => serde_json::to_string(value).ok(),
        None => None,
    }
}

pub(crate) async fn reconcile_session_deletion(
    transaction: &mut Transaction<'_, Sqlite>,
    workspace_id: &str,
    table: &str,
    row_id: &str,
) -> Result<(), sqlx::Error> {
    let session_ids = match table {
        "sessions" => vec![row_id.to_owned()],
        "session_documents"
        | "transcripts"
        | "session_attachments"
        | "session_participants"
        | "session_tags"
        | "action_items" => {
            let query = format!("SELECT session_id FROM {table} WHERE id = ? AND workspace_id = ?");
            let Some(id) = sqlx::query_scalar::<_, String>(sqlx::AssertSqlSafe(query))
                .bind(row_id)
                .bind(workspace_id)
                .fetch_optional(&mut **transaction)
                .await?
            else {
                return Ok(());
            };
            vec![id]
        }
        "entity_mentions" => {
            sqlx::query_scalar::<_, String>(
                "SELECT source_id FROM entity_mentions
             WHERE id = ?1 AND workspace_id = ?2 AND source_type = 'session'
             UNION SELECT target_id FROM entity_mentions
             WHERE id = ?1 AND workspace_id = ?2 AND target_type = 'session'",
            )
            .bind(row_id)
            .bind(workspace_id)
            .fetch_all(&mut **transaction)
            .await?
        }
        _ => return Ok(()),
    };
    for session_id in session_ids {
        reconcile_deleted_session(transaction, workspace_id, &session_id).await?;
    }
    Ok(())
}

async fn reconcile_deleted_session(
    transaction: &mut Transaction<'_, Sqlite>,
    workspace_id: &str,
    session_id: &str,
) -> Result<(), sqlx::Error> {
    let Some((context, current_deleted_at)) = sqlx::query_as::<_, (String, Option<String>)>(
        "SELECT deletion_context, deleted_at FROM sessions
         WHERE id = ? AND workspace_id = ? AND deletion_context <> ''",
    )
    .bind(session_id)
    .bind(workspace_id)
    .fetch_optional(&mut **transaction)
    .await?
    else {
        return Ok(());
    };
    let Ok(context) = serde_json::from_str::<DeletionContext>(&context) else {
        return Ok(());
    };
    if context.version != 1 || context.deleted_at.is_empty() {
        return Ok(());
    }

    let content: Vec<(String, String)> = sqlx::query_as(
        "SELECT content_id, content_version FROM session_content_observations
         WHERE session_id = ? AND workspace_id = ?
           AND (deleted_at IS NULL OR deleted_at = ?)",
    )
    .bind(session_id)
    .bind(workspace_id)
    .bind(&context.deleted_at)
    .fetch_all(&mut **transaction)
    .await?;
    let unseen_content = content.iter().any(|(id, version)| {
        observed_content_version(context.observed.get(id)).as_deref() != Some(version)
    });
    let deleted_at = (!unseen_content).then_some(context.deleted_at.as_str());

    // Keep the original observation even after restoring the note. Later row
    // groups must reach the same result regardless of their delivery order.
    sqlx::query(
        "INSERT OR IGNORE INTO e2ee_apply_guard (workspace_id, table_name, row_id)
         VALUES (?, 'sessions', ?)",
    )
    .bind(workspace_id)
    .bind(session_id)
    .execute(&mut **transaction)
    .await?;
    if current_deleted_at.as_deref() != deleted_at {
        sqlx::query("UPDATE sessions SET deleted_at = ? WHERE id = ? AND workspace_id = ?")
            .bind(deleted_at)
            .bind(session_id)
            .bind(workspace_id)
            .execute(&mut **transaction)
            .await?;
        sqlx::query(
            "INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
             VALUES (?, 'sessions', ?)
             ON CONFLICT(workspace_id, table_name, row_id)
             DO UPDATE SET generation = generation + 1",
        )
        .bind(workspace_id)
        .bind(session_id)
        .execute(&mut **transaction)
        .await?;
    }
    let predicate = if unseen_content {
        "deleted_at = ?"
    } else {
        "deleted_at IS NULL AND ? IS NOT NULL"
    };
    for table in [
        "session_documents",
        "transcripts",
        "session_attachments",
        "session_participants",
        "session_tags",
        "action_items",
    ] {
        let query = format!(
            "UPDATE {table} SET deleted_at = ?
             WHERE session_id = ? AND workspace_id = ? AND {predicate}"
        );
        sqlx::query(sqlx::AssertSqlSafe(query))
            .bind(deleted_at)
            .bind(session_id)
            .bind(workspace_id)
            .bind(&context.deleted_at)
            .execute(&mut **transaction)
            .await?;
    }
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE entity_mentions SET deleted_at = ?
         WHERE workspace_id = ? AND (
           (source_type = 'session' AND source_id = ?)
           OR (target_type = 'session' AND target_id = ?)
         ) AND {predicate}"
    )))
    .bind(deleted_at)
    .bind(workspace_id)
    .bind(session_id)
    .bind(session_id)
    .bind(&context.deleted_at)
    .execute(&mut **transaction)
    .await?;
    sqlx::query(
        "DELETE FROM e2ee_apply_guard WHERE workspace_id = ? AND table_name = 'sessions' AND row_id = ?",
    )
    .bind(workspace_id)
    .bind(session_id)
    .execute(&mut **transaction)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn observed_content_versions_accept_strings_and_json_values() {
        let context: DeletionContext = serde_json::from_str(
            r#"{
              "version": 1,
              "deletedAt": "2099-01-01",
              "observed": {
                "document:meeting": "content-token",
                "attachment:meeting": ["sha", 123, "", "", ""]
              }
            }"#,
        )
        .unwrap();

        assert_eq!(
            observed_content_version(context.observed.get("document:meeting")),
            Some("content-token".into())
        );
        assert_eq!(
            observed_content_version(context.observed.get("attachment:meeting")),
            Some(r#"["sha",123,"","",""]"#.into())
        );
    }
}
