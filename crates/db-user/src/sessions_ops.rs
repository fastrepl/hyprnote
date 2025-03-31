use super::{
    ConversationChunk, Event, GetSessionFilter, Human, ListSessionFilter, ListSessionFilterCommon,
    ListSessionFilterSpecific, Session, UserDatabase,
};

const ONBOARDING_ENHANCED_MD: &str = include_str!("../assets/onboarding-enhanced.md");

impl UserDatabase {
    pub fn onboarding_session_enhanced_memo_html(&self) -> String {
        hypr_buffer::opinionated_md_to_html(ONBOARDING_ENHANCED_MD).unwrap()
    }

    pub fn onboarding_session_id(&self) -> String {
        "df1d8c52-6d9d-4471-aff1-5dbd35899cbe".to_string()
    }

    pub fn onboarding_session_conversations(&self) -> Vec<ConversationChunk> {
        vec![ConversationChunk {
            start: chrono::Utc::now(),
            end: chrono::Utc::now(),
            transcripts: vec![hypr_listener_interface::TranscriptChunk {
                start: 0,
                end: 1000,
                text: "Hello, how are you?".to_string(),
            }],
            diarizations: vec![],
        }]
    }

    pub async fn get_session(
        &self,
        filter: GetSessionFilter,
    ) -> Result<Option<Session>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = match filter {
            GetSessionFilter::Id(id) => conn
                .query("SELECT * FROM sessions WHERE id = ?", vec![id])
                .await
                .unwrap(),
            GetSessionFilter::CalendarEventId(id) => conn
                .query(
                    "SELECT * FROM sessions WHERE calendar_event_id = ?",
                    vec![id],
                )
                .await
                .unwrap(),
            GetSessionFilter::TagId(id) => conn
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
                let item = Session::from_row(&row)?;
                Ok(Some(item))
            }
        }
    }

    pub async fn visit_session(&self, id: impl Into<String>) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute(
            "UPDATE sessions SET visited_at = ? WHERE id = ?",
            (chrono::Utc::now().to_rfc3339(), id.into()),
        )
        .await?;
        Ok(())
    }

    pub async fn delete_session(&self, id: impl Into<String>) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute("DELETE FROM sessions WHERE id = ?", vec![id.into()])
            .await?;
        Ok(())
    }

    pub async fn list_sessions(
        &self,
        filter: Option<ListSessionFilter>,
    ) -> Result<Vec<Session>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = match filter {
            Some(ListSessionFilter {
                common: ListSessionFilterCommon { user_id, limit },
                specific: ListSessionFilterSpecific::Search { query },
            }) => {
                conn.query(
                    "SELECT * FROM sessions WHERE user_id = ? AND title LIKE ? ORDER BY created_at DESC LIMIT ?",
                    vec![user_id, format!("%{}%", query), limit.unwrap_or(100).to_string()],
                )
                .await?
            }
            Some(ListSessionFilter {
                common: ListSessionFilterCommon { user_id, limit },
                specific: ListSessionFilterSpecific::RecentlyVisited {},
            }) => {
                conn.query(
                    "SELECT * FROM sessions WHERE user_id = ? ORDER BY visited_at DESC LIMIT ?",
                    vec![user_id, limit.unwrap_or(100).to_string()],
                )
                .await?
            }
            Some(ListSessionFilter {
                common: ListSessionFilterCommon { user_id, limit },
                specific: ListSessionFilterSpecific::DateRange { start, end },
            }) => {
                conn.query(
                    "
                    SELECT s.* FROM sessions s
                    LEFT JOIN events e ON s.calendar_event_id = e.id
                    WHERE
                        s.user_id = :user_id AND
                        (
                            (s.calendar_event_id IS NULL AND s.created_at BETWEEN :start_time AND :end_time)
                            OR
                            (s.calendar_event_id IS NOT NULL AND e.start_date BETWEEN :start_time AND :end_time)
                        )
                    ORDER BY
                        CASE
                            WHEN s.calendar_event_id IS NULL THEN s.created_at
                            ELSE e.start_date
                        END DESC
                    LIMIT :limit",
                    libsql::named_params! {
                        ":user_id": user_id,
                        ":start_time": start.to_rfc3339(),
                        ":end_time": end.to_rfc3339(),
                        ":limit": limit.unwrap_or(100).to_string(),
                    },
                )
                .await?
            }
            None => {
                conn.query(
                    "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100",
                    (),
                )
                .await?
            }
        };

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item = Session::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_session(&self, session: Session) -> Result<Session, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT OR REPLACE INTO sessions (
                    id,
                    created_at,
                    visited_at,
                    user_id,
                    calendar_event_id,
                    title,
                    raw_memo_html,
                    enhanced_memo_html,
                    conversations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(session.id),
                    libsql::Value::Text(session.created_at.to_rfc3339()),
                    libsql::Value::Text(session.visited_at.to_rfc3339()),
                    libsql::Value::Text(session.user_id),
                    session
                        .calendar_event_id
                        .map_or(libsql::Value::Null, libsql::Value::Text),
                    libsql::Value::Text(session.title),
                    libsql::Value::Text(session.raw_memo_html),
                    session
                        .enhanced_memo_html
                        .map_or(libsql::Value::Null, libsql::Value::Text),
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
        let conn = self.conn()?;

        conn.query(
            "UPDATE sessions SET calendar_event_id = ? WHERE id = ?",
            vec![event_id, session_id],
        )
        .await?;
        Ok(())
    }

    pub async fn session_add_participant(
        &self,
        session_id: impl Into<String>,
        human_id: impl Into<String>,
    ) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute(
            "INSERT OR REPLACE INTO session_participants (session_id, human_id) VALUES (?, ?)",
            vec![session_id.into(), human_id.into()],
        )
        .await?;
        Ok(())
    }

    pub async fn session_remove_participant(
        &self,
        session_id: impl Into<String>,
        human_id: impl Into<String>,
    ) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute(
            "DELETE FROM session_participants WHERE session_id = ? AND human_id = ?",
            vec![session_id.into(), human_id.into()],
        )
        .await?;
        Ok(())
    }

    pub async fn session_list_participants(
        &self,
        session_id: impl Into<String>,
    ) -> Result<Vec<Human>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT h.* FROM humans h
                JOIN session_participants sp ON h.id = sp.human_id
                WHERE sp.session_id = ?",
                vec![session_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Human = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn session_get_event(
        &self,
        session_id: impl Into<String>,
    ) -> Result<Option<Event>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT e.* FROM events e
                JOIN sessions s ON e.id = s.calendar_event_id
                WHERE s.id = ?",
                vec![session_id.into()],
            )
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let event: Event = libsql::de::from_row(&row)?;
                Ok(Some(event))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::{tests::setup_db, Human, Session};

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
            created_at: chrono::Utc::now(),
            visited_at: chrono::Utc::now(),
            calendar_event_id: None,
            title: "test".to_string(),
            raw_memo_html: "raw_memo_html_1".to_string(),
            conversations: vec![],
            enhanced_memo_html: None,
        };

        let mut session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "raw_memo_html_1");
        assert_eq!(session.enhanced_memo_html, None);
        assert_eq!(session.title, "test");
        assert_eq!(session.conversations, vec![]);

        let sessions = db.list_sessions(None).await.unwrap();
        assert_eq!(sessions.len(), 1);

        session.raw_memo_html = "raw_memo_html_2".to_string();
        let session = db.upsert_session(session).await.unwrap();
        assert_eq!(session.raw_memo_html, "raw_memo_html_2");

        let sessions = db.list_sessions(None).await.unwrap();
        assert_eq!(sessions.len(), 1);

        db.delete_session(&session.id).await.unwrap();
        let sessions = db.list_sessions(None).await.unwrap();
        assert_eq!(sessions.len(), 0);

        let participants = db.session_list_participants(&session.id).await.unwrap();
        assert_eq!(participants.len(), 0);

        assert_eq!(db.session_get_event(&session.id).await.unwrap(), None);
    }
}
