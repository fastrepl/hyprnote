use super::{Session, SessionRow};
use anyhow::Result;

use crate::Connection;

#[derive(Clone)]
pub struct UserDatabase {
    pub conn: Connection,
}

impl UserDatabase {
    pub async fn from(conn: Connection) -> Self {
        Self { conn }
    }

    pub async fn create_session(&self, session: Session) -> Result<Session> {
        let session = SessionRow::from(session);

        let mut rows = self
            .conn
            .query(
                "INSERT INTO sessions (
                    title,
                    raw_memo,
                    enhanced_memo,
                    tags,
                    transcript
                ) VALUES ( ?, ?, ?, ?, ?)
                RETURNING *",
                vec![
                    session.title,
                    session.raw_memo.unwrap_or("null".to_string()),
                    session.enhanced_memo.unwrap_or("null".to_string()),
                    session.tags.unwrap_or("[]".to_string()),
                    session.transcript.unwrap_or("null".to_string()),
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let session: SessionRow = libsql::de::from_row(&row)?;
        let session = Session::from(session);

        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{migrate, user::migrations, ConnectionBuilder};

    async fn setup_db() -> UserDatabase {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        migrate(&conn, migrations::v0()).await.unwrap();
        UserDatabase::from(conn).await
    }

    #[tokio::test]
    async fn test_simple() {
        let db = setup_db().await;
        let session = Session {
            title: "test".to_string(),
            tags: vec!["test".to_string()],
            ..Session::default()
        };

        let session = db.create_session(session).await.unwrap();
        assert_eq!(session.title, "test");
        assert_eq!(session.tags, vec!["test".to_string()]);
    }
}
