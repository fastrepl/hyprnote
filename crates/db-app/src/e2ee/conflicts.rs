use serde::Serialize;
use serde_json::Value;
use sqlx::{Sqlite, SqlitePool, Transaction};

use super::replica_storage::{table_columns, update_field};
use super::{E2EE_DOMAIN_TABLES, E2eeReplicaError, E2eeReplicaResult};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum ConflictLoser {
    Local,
    Remote,
}

impl ConflictLoser {
    fn as_str(self) -> &'static str {
        match self {
            Self::Local => "local",
            Self::Remote => "remote",
        }
    }
}

pub(super) struct ConflictCopy<'a> {
    pub id: String,
    pub workspace_id: &'a str,
    pub table_name: &'a str,
    pub row_id: &'a str,
    pub field_name: &'a str,
    pub lost_side: ConflictLoser,
    pub writer_id: &'a str,
    pub revision: i64,
    pub edited_at_ms: Option<i64>,
    pub value: &'a Value,
}

/// Keeps the value that lost a concurrent edit. Ids are derived from the
/// losing version so a conflict re-evaluated on a later sync round is not
/// recorded twice.
pub(super) async fn record_conflict(
    transaction: &mut Transaction<'_, Sqlite>,
    copy: &ConflictCopy<'_>,
) -> E2eeReplicaResult<bool> {
    let value_json =
        serde_json::to_string(copy.value).map_err(|_| E2eeReplicaError::UnsupportedValue)?;
    let inserted = sqlx::query(
        "INSERT INTO e2ee_field_conflicts (
           id, workspace_id, table_name, row_id, field_name, lost_side,
           writer_id, revision, edited_at_ms, value_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING",
    )
    .bind(&copy.id)
    .bind(copy.workspace_id)
    .bind(copy.table_name)
    .bind(copy.row_id)
    .bind(copy.field_name)
    .bind(copy.lost_side.as_str())
    .bind(copy.writer_id)
    .bind(copy.revision)
    .bind(copy.edited_at_ms)
    .bind(value_json)
    .execute(&mut **transaction)
    .await?
    .rows_affected();
    Ok(inserted > 0)
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct E2eeFieldConflict {
    pub id: String,
    pub workspace_id: String,
    pub table_name: String,
    pub row_id: String,
    pub field_name: String,
    pub lost_side: String,
    pub writer_id: String,
    pub revision: i64,
    pub edited_at_ms: Option<i64>,
    pub value_json: String,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

pub async fn list_e2ee_field_conflicts(
    pool: &SqlitePool,
    table_name: &str,
    row_id: &str,
    include_resolved: bool,
) -> sqlx::Result<Vec<E2eeFieldConflict>> {
    sqlx::query_as(
        "SELECT id, workspace_id, table_name, row_id, field_name, lost_side,
                writer_id, revision, edited_at_ms, value_json, created_at, resolved_at
         FROM e2ee_field_conflicts
         WHERE table_name = ? AND row_id = ? AND (? OR resolved_at IS NULL)
         ORDER BY created_at DESC, id",
    )
    .bind(table_name)
    .bind(row_id)
    .bind(include_resolved)
    .fetch_all(pool)
    .await
}

pub async fn unresolved_e2ee_field_conflict_count(pool: &SqlitePool) -> sqlx::Result<i64> {
    sqlx::query_scalar("SELECT COUNT(*) FROM e2ee_field_conflicts WHERE resolved_at IS NULL")
        .fetch_one(pool)
        .await
}

pub async fn resolve_e2ee_field_conflict(pool: &SqlitePool, id: &str) -> sqlx::Result<bool> {
    let updated = sqlx::query(
        "UPDATE e2ee_field_conflicts
         SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ? AND resolved_at IS NULL",
    )
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected();
    Ok(updated > 0)
}

/// Writes the losing value back as a fresh local edit. It syncs like any other
/// local write, so it wins on every device with the current edit time.
pub async fn restore_e2ee_field_conflict(pool: &SqlitePool, id: &str) -> E2eeReplicaResult<bool> {
    let Some(conflict): Option<E2eeFieldConflict> = sqlx::query_as(
        "SELECT id, workspace_id, table_name, row_id, field_name, lost_side,
                writer_id, revision, edited_at_ms, value_json, created_at, resolved_at
         FROM e2ee_field_conflicts
         WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    else {
        return Ok(false);
    };
    if !E2EE_DOMAIN_TABLES.contains(&conflict.table_name.as_str()) {
        return Err(E2eeReplicaError::InvalidField);
    }
    let columns = table_columns(pool, &conflict.table_name).await?;
    if matches!(conflict.field_name.as_str(), "id" | "workspace_id")
        || !columns.contains(&conflict.field_name)
    {
        return Err(E2eeReplicaError::InvalidField);
    }
    let value: Value =
        serde_json::from_str(&conflict.value_json).map_err(|_| E2eeReplicaError::InvalidRow)?;

    let mut transaction = pool.begin_with("BEGIN IMMEDIATE").await?;
    update_field(
        &mut transaction,
        &conflict.table_name,
        &conflict.workspace_id,
        &conflict.row_id,
        &conflict.field_name,
        &value,
    )
    .await?;
    sqlx::query(
        "UPDATE e2ee_field_conflicts
         SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?",
    )
    .bind(id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    Ok(true)
}
