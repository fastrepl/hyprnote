use anyhow::Result;
use time::format_description::well_known::Rfc3339;

use super::UserDatabase;
use crate::user::{GetSessionOption, Session, SessionRawMemoHistory};

impl UserDatabase {
    pub async fn get_session(&self, option: GetSessionOption) -> Result<Option<Session>> {
        let mut rows = match option {
            GetSessionOption::Id(id) => self
                .conn
                .query("SELECT * FROM sessions WHERE id = ?", vec![id])
                .await
                .unwrap(),
            GetSessionOption::CalendarEventId(id) => self
                .conn
                .query(
                    "SELECT * FROM sessions WHERE calendar_event_id = ?",
                    vec![id],
                )
                .await
                .unwrap(),
        };

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
                    "SELECT * FROM sessions WHERE title LIKE ? ORDER BY timestamp DESC LIMIT 100",
                    vec![format!("%{}%", q)],
                )
                .await
                .unwrap(),
            None => self
                .conn
                .query(
                    "SELECT * FROM sessions ORDER BY timestamp DESC LIMIT 100",
                    (),
                )
                .await
                .unwrap(),
        };

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item = Session::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn list_session_raw_memo_history(
        &self,
        session_id: String,
    ) -> Result<Vec<SessionRawMemoHistory>> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM sessions_raw_memo_history WHERE session_id = ?",
                vec![session_id],
            )
            .await
            .unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: SessionRawMemoHistory = libsql::de::from_row(&row)?;
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
                    conversations
                ) VALUES (:id, :timestamp, :calendar_event_id, :title, :raw_memo_html, :enhanced_memo_html, :tags, :conversations) 
                ON CONFLICT(id) DO UPDATE SET
                    timestamp = :timestamp,
                    title = :title,
                    raw_memo_html = :raw_memo_html,
                    enhanced_memo_html = :enhanced_memo_html,
                    tags = :tags,
                    conversations = :conversations
                RETURNING *",
                libsql::named_params! {
                    ":id": libsql::Value::Text(session.id),
                    ":timestamp": libsql::Value::Text(session.timestamp.format(&Rfc3339).unwrap()),
                    ":calendar_event_id": session.calendar_event_id.map_or(libsql::Value::Null, |v| libsql::Value::Text(v)),
                    ":title": libsql::Value::Text(session.title),
                    ":raw_memo_html": libsql::Value::Text(session.raw_memo_html),
                    ":enhanced_memo_html": session.enhanced_memo_html.map_or(libsql::Value::Null, |v| libsql::Value::Text(v)),
                    ":tags": libsql::Value::Text(serde_json::to_string(&session.tags).unwrap()),
                    ":conversations": libsql::Value::Text(serde_json::to_string(&session.conversations).unwrap()),
                },
            ).await?;

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
    use crate::user::ops::tests::setup_db;

    #[tokio::test]
    async fn test_sessions() {
        let db = setup_db().await;

        let sessions = db.list_sessions(None).await.unwrap();
        assert_eq!(sessions.len(), 0);

        let session = Session {
            title: "test".to_string(),
            raw_memo_html: "raw_memo_html_1".to_string(),
            tags: vec!["test".to_string()],
            conversations: vec![],
            ..Session::default()
        };

        let mut session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "raw_memo_html_1");
        assert_eq!(session.enhanced_memo_html, None);
        assert_eq!(session.title, "test");
        assert_eq!(session.tags, vec!["test".to_string()]);
        assert_eq!(session.conversations, vec![]);

        let sessions = db.list_sessions(Some("test")).await.unwrap();
        assert_eq!(sessions.len(), 1);

        session.raw_memo_html = "raw_memo_html_2".to_string();
        let session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "raw_memo_html_2");

        let history = db.list_session_raw_memo_history(session.id).await.unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].raw_memo_html, "raw_memo_html_1");
    }
}
