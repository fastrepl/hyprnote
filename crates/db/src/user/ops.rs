use anyhow::Result;

use super::Session;
use crate::Connection;

#[derive(Clone)]
pub struct UserDatabase {
    pub conn: Connection,
}

impl UserDatabase {
    pub async fn from(conn: Connection) -> Self {
        Self { conn }
    }

    pub async fn list_sessions(&self) -> Result<Vec<Session>> {
        let mut rows = self.conn.query("SELECT * FROM sessions", ()).await.unwrap();
        let mut sessions = Vec::new();

        while let Some(row) = rows.next().await.unwrap() {
            let session: Session = libsql::de::from_row(&row)?;
            sessions.push(session);
        }

        Ok(sessions)
    }

    pub async fn create_session(&self, session: Session) -> Result<Session> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO sessions (
                    title,
                    raw_memo_html,
                    enhanced_memo_html,
                    tags,
                    transcript
                ) VALUES (?, ?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(session.title),
                    libsql::Value::Text(session.raw_memo_html),
                    session
                        .enhanced_memo_html
                        .map_or(libsql::Value::Null, |v| libsql::Value::Text(v)),
                    libsql::Value::Text(serde_json::to_string(&session.tags).unwrap()),
                    session.transcript.map_or(libsql::Value::Null, |v| {
                        libsql::Value::Text(serde_json::to_string(&v).unwrap())
                    }),
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let session: Session = libsql::de::from_row(&row)?;
        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrate,
        user::{migrations, Transcript},
        ConnectionBuilder,
    };

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
    async fn test_sessions() {
        let db = setup_db().await;

        let sessions = db.list_sessions().await.unwrap();
        assert_eq!(sessions.len(), 0);

        let session = Session {
            title: "test".to_string(),
            tags: vec!["test".to_string()],
            transcript: Some(Transcript {
                speakers: vec![],
                blocks: vec![],
            }),
            ..Session::default()
        };

        let session = db.create_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "");
        assert_eq!(session.enhanced_memo_html, None);
        assert_eq!(session.title, "test");
        assert_eq!(session.tags, vec!["test".to_string()]);
        assert_eq!(
            session.transcript,
            Some(Transcript {
                speakers: vec![],
                blocks: vec![],
            })
        );

        let sessions = db.list_sessions().await.unwrap();
        assert_eq!(sessions.len(), 1);
    }
}
