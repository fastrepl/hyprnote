use crate::types;
use anyhow::Result;

pub trait SqliteExecutor<'c>: sqlx::Executor<'c, Database = sqlx::Sqlite> {}
impl<'c, T: sqlx::Executor<'c, Database = sqlx::Sqlite>> SqliteExecutor<'c> for T {}

pub async fn create_session<'c, E: SqliteExecutor<'c>>(e: E) -> Result<types::Session> {
    let session = types::Session::default();

    let ret = sqlx::query_as(
        "INSERT INTO sessions (
            id, start, end, recording_path, tags, raw_memo, processed_memo, raw_transcript
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *",
    )
    .bind(session.id)
    .bind(session.start)
    .bind(session.end)
    .bind(session.recording_path)
    .bind(serde_json::to_string(&session.tags).unwrap_or("[]".to_string()))
    .bind(session.raw_memo)
    .bind(session.processed_memo)
    .bind(session.raw_transcript)
    .fetch_one(e)
    .await?;

    Ok(ret)
}

pub async fn update_session<'c, E: SqliteExecutor<'c>>(
    e: E,
    session: types::Session,
) -> Result<types::Session> {
    let ret = sqlx::query_as(
        r#"
        UPDATE sessions 
        SET end = ?, 
            tags = ?, 
            recording_path = ?,
            raw_memo = ?, 
            processed_memo = ?, 
            raw_transcript = ? 
        WHERE id = ?
        RETURNING *
        "#,
    )
    .bind(session.end)
    .bind(serde_json::to_string(&session.tags).unwrap_or("[]".to_string()))
    .bind(session.recording_path)
    .bind(session.raw_memo)
    .bind(session.processed_memo)
    .bind(session.raw_transcript)
    .bind(session.id)
    .fetch_one(e)
    .await?;

    Ok(ret)
}

pub async fn list_sessions<'c, E: SqliteExecutor<'c>>(e: E) -> Result<Vec<types::Session>> {
    let result = sqlx::query_as("SELECT * FROM sessions")
        .fetch_all(e)
        .await?;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[sqlx::test]
    async fn test_create_session(pool: SqlitePool) {
        let sessions = list_sessions(&pool).await.unwrap();
        assert_eq!(sessions.len(), 0);

        let _ = create_session(&pool).await.unwrap();

        let sessions = list_sessions(&pool).await.unwrap();
        assert_eq!(sessions.len(), 1);
    }

    #[sqlx::test]
    async fn test_update_session(pool: SqlitePool) {
        let mut session = create_session(&pool).await.unwrap();
        assert!(session.end.is_none());
        session.end = Some(time::OffsetDateTime::now_utc());

        let updated = update_session(&pool, session).await.unwrap();
        assert!(updated.end.is_some());
    }
}
