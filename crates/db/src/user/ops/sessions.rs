use anyhow::Result;
use time::format_description::well_known::Rfc3339;

use super::UserDatabase;
use crate::user::Session;

impl UserDatabase {
    pub async fn get_session(&self, id: String) -> Result<Option<Session>> {
        let mut rows = self
            .conn
            .query("SELECT * FROM sessions WHERE id = ?", vec![id])
            .await
            .unwrap();

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let session = Session::from_row(&row)?;
                Ok(Some(session))
            }
        }
    }

    pub async fn list_sessions(&self, search: Option<&str>) -> Result<Vec<Session>> {
        let mut rows = match search {
            Some(q) => self
                .conn
                .query(
                    "SELECT * FROM sessions WHERE title LIKE ?",
                    vec![format!("%{}%", q)],
                )
                .await
                .unwrap(),
            None => self.conn.query("SELECT * FROM sessions", ()).await.unwrap(),
        };

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item = Session::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_session(&self, session: Session) -> Result<Session> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO sessions (
                    id,
                    timestamp,
                    calendar_event_id,
                    title,
                    raw_memo_html,
                    enhanced_memo_html,
                    tags,
                    transcript
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
                    title = :title,
                    raw_memo_html = :raw_memo_html,
                    enhanced_memo_html = :enhanced_memo_html,
                    tags = :tags,
                    transcript = :transcript
                RETURNING *",
                vec![
                    libsql::Value::Text(session.id),
                    libsql::Value::Text(session.timestamp.format(&Rfc3339).unwrap()),
                    session
                        .calendar_event_id
                        .map_or(libsql::Value::Null, |v| libsql::Value::Text(v)),
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
        let session = Session::from_row(&row)?;
        Ok(session)
    }

    pub async fn session_set_event(&self, session_id: String, event_id: String) -> Result<()> {
        self.conn
            .query(
                "UPDATE sessions SET calendar_event_id = ? WHERE id = ?",
                vec![event_id, session_id],
            )
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::{ops::tests::setup_db, Transcript};

    #[tokio::test]
    async fn test_sessions() {
        let db = setup_db().await;

        let sessions = db.list_sessions(None).await.unwrap();
        assert_eq!(sessions.len(), 0);

        let session = Session {
            title: "test".to_string(),
            tags: vec!["test".to_string()],
            transcript: None,
            ..Session::default()
        };

        let session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "");
        assert_eq!(session.enhanced_memo_html, None);
        assert_eq!(session.title, "test");
        assert_eq!(session.tags, vec!["test".to_string()]);
        assert_eq!(session.transcript, None);

        let sessions = db.list_sessions(Some("test")).await.unwrap();
        assert_eq!(sessions.len(), 1);
    }
}
