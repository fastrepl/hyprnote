use super::{Session, SessionFilter, UserDatabase};

impl UserDatabase {
    pub async fn get_session(
        &self,
        option: SessionFilter,
    ) -> Result<Option<Session>, crate::Error> {
        let mut rows = match option {
            SessionFilter::Id(id) => self
                .conn
                .query("SELECT * FROM sessions WHERE id = ?", vec![id])
                .await
                .unwrap(),
            SessionFilter::CalendarEventId(id) => self
                .conn
                .query(
                    "SELECT * FROM sessions WHERE calendar_event_id = ?",
                    vec![id],
                )
                .await
                .unwrap(),
            SessionFilter::TagId(id) => self
                .conn
                .query(
                    "SELECT * FROM sessions WHERE id IN (SELECT session_id FROM tags WHERE id = ?)",
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

    pub async fn list_sessions(&self, search: Option<&str>) -> Result<Vec<Session>, crate::Error> {
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

    pub async fn upsert_session(&self, session: Session) -> Result<Session, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT OR REPLACE INTO sessions (
                    id,
                    user_id,
                    timestamp,
                    calendar_event_id,
                    title,
                    raw_memo_html,
                    enhanced_memo_html,
                    conversations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(session.id),
                    libsql::Value::Text(session.user_id),
                    libsql::Value::Text(session.timestamp.to_rfc3339()),
                    session
                        .calendar_event_id
                        .map_or(libsql::Value::Null, |v| libsql::Value::Text(v)),
                    libsql::Value::Text(session.title),
                    libsql::Value::Text(session.raw_memo_html),
                    session
                        .enhanced_memo_html
                        .map_or(libsql::Value::Null, |v| libsql::Value::Text(v)),
                    libsql::Value::Text(serde_json::to_string(&session.conversations).unwrap()),
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let session = Session::from_row(&row)?;
        Ok(session)
    }

    pub async fn session_set_event(
        &self,
        session_id: String,
        event_id: String,
    ) -> Result<(), crate::Error> {
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
    use crate::user::{tests::setup_db, Human, Session};

    #[tokio::test]
    async fn test_sessions() {
        let db = setup_db().await;

        let sessions = db.list_sessions(None).await.unwrap();
        assert_eq!(sessions.len(), 0);

        let user = db
            .upsert_human(Human {
                full_name: Some("John Doe".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let session = Session {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            timestamp: chrono::Utc::now(),
            calendar_event_id: None,
            title: "test".to_string(),
            raw_memo_html: "raw_memo_html_1".to_string(),
            conversations: vec![],
            audio_local_path: None,
            audio_remote_path: None,
            enhanced_memo_html: None,
        };

        let mut session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "raw_memo_html_1");
        assert_eq!(session.enhanced_memo_html, None);
        assert_eq!(session.title, "test");
        assert_eq!(session.conversations, vec![]);

        let sessions = db.list_sessions(Some("test")).await.unwrap();
        assert_eq!(sessions.len(), 1);

        session.raw_memo_html = "raw_memo_html_2".to_string();
        let session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "raw_memo_html_2");
    }
}
