mod types;

#[derive(Debug)]
pub struct Migration {
    pub version: i64,
    pub description: &'static str,
    pub sql: &'static str,
    pub kind: MigrationKind,
}

#[derive(Debug)]
pub enum MigrationKind {
    Up,
    Down,
}

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "20241213001503_initial.up",
        sql: include_str!("../migrations/20241213001503_initial.up.sql"),
        kind: MigrationKind::Up,
    }]
}

pub fn export_ts_types_to(path: impl AsRef<std::path::Path>) -> anyhow::Result<()> {
    let mut collection = specta_util::TypeCollection::default();
    types::register_all(&mut collection);

    let language = specta_typescript::Typescript::default()
        .header("// @ts-nocheck\n\n")
        .formatter(specta_typescript::formatter::prettier)
        .bigint(specta_typescript::BigIntExportBehavior::Number);

    collection.export_to(language, path)?;
    Ok(())
}

pub async fn create_session(pool: sqlx::sqlite::SqlitePool) -> anyhow::Result<()> {
    let id = uuid::Uuid::new_v4();
    let start = time::OffsetDateTime::now_utc();
    let end: Option<time::OffsetDateTime> = None;
    let tags = vec!["test".to_string()];
    let raw_memo = "raw memo".to_string();
    let processed_memo = "processed memo".to_string();
    let raw_transcript = "raw transcript".to_string();

    let _ = sqlx::query(
        "INSERT INTO sessions (
            id, start, end, tags, raw_memo, processed_memo, raw_transcript
        ) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(start)
    .bind(end)
    .bind(format!("[{}]", tags.join(",")))
    .bind(raw_memo)
    .bind(processed_memo)
    .bind(raw_transcript)
    .execute(&pool)
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[sqlx::test]
    async fn test_sessions(pool: SqlitePool) -> sqlx::Result<()> {
        let result = create_session(pool).await;
        assert!(result.is_ok());
        Ok(())
    }
}
