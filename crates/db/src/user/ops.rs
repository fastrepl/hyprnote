use anyhow::Result;

#[allow(unused_imports)]
use super::{Calendar, Event, Platform, Session};
use crate::Connection;

#[derive(Clone)]
pub struct UserDatabase {
    pub conn: Connection,
}

impl UserDatabase {
    pub fn from(conn: Connection) -> Self {
        Self { conn }
    }

    pub async fn list_sessions(&self) -> Result<Vec<Session>> {
        let mut rows = self.conn.query("SELECT * FROM sessions", ()).await.unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Session = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
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

    pub async fn list_calendars(&self) -> Result<Vec<Calendar>> {
        let mut rows = self
            .conn
            .query("SELECT * FROM calendars", ())
            .await
            .unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Calendar = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_calendar(&self, calendar: Calendar) -> Result<Calendar> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO calendars (
                    id,
                    name,
                    platform
                ) VALUES (
                    :id,
                    :name,
                    :platform
                ) ON CONFLICT(id) DO UPDATE SET
                    id = :id,
                    name = :name,
                    platform = :platform
                RETURNING *",
                libsql::named_params! {
                    ":id": calendar.id,
                    ":name": calendar.name,
                    ":platform": calendar.platform.to_string(),
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let calendar: Calendar = libsql::de::from_row(&row)?;
        Ok(calendar)
    }

    pub async fn list_events(&self) -> Result<Vec<Event>> {
        let mut rows = self
            .conn
            .query("SELECT * FROM calendar_events", ())
            .await
            .unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Event = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_event(&self, event: Event) -> Result<Event> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO calendar_events (
                    id,
                    calendar_id,
                    platform,
                    name,
                    note,
                    participants,
                    start_date,
                    end_date,
                    google_event_url
                ) VALUES (
                    :id,
                    :calendar_id,
                    :platform,
                    :name,
                    :note,
                    :participants,
                    :start_date,
                    :end_date,
                    :google_event_url
                ) ON CONFLICT(id) DO UPDATE SET
                    calendar_id = :calendar_id,
                    platform = :platform,
                    name = :name,
                    note = :note,
                    participants = :participants,
                    start_date = :start_date,
                    end_date = :end_date,
                    google_event_url = :google_event_url
                RETURNING *",
                libsql::named_params! {
                    ":id": event.id,
                    ":calendar_id": event.calendar_id,
                    ":platform": event.platform.to_string(),
                    ":name": event.name,
                    ":note": event.note,
                    ":participants": serde_json::to_string(&event.participants).unwrap(),
                    ":start_date": event.start_date.unix_timestamp(),
                    ":end_date": event.end_date.unix_timestamp(),
                    ":google_event_url": event.google_event_url,
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let event: Event = libsql::de::from_row(&row)?;
        Ok(event)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        user::{migrate, seed, Transcript},
        ConnectionBuilder,
    };

    async fn setup_db() -> UserDatabase {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        migrate(&conn).await.unwrap();
        UserDatabase::from(conn)
    }

    #[tokio::test]
    async fn test_seed() {
        let db = setup_db().await;
        seed(&db).await.unwrap();
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

    #[tokio::test]
    async fn test_calendars() {
        let db = setup_db().await;

        let calendars = db.list_calendars().await.unwrap();
        assert_eq!(calendars.len(), 0);

        let input_1 = Calendar {
            id: "test".to_string(),
            name: "test".to_string(),
            platform: Platform::Google,
        };

        let output_1 = db.upsert_calendar(input_1.clone()).await.unwrap();
        assert_eq!(output_1, input_1);

        let output_2 = db.upsert_calendar(input_1.clone()).await.unwrap();
        assert_eq!(output_2, input_1);

        let calendars = db.list_calendars().await.unwrap();
        assert_eq!(calendars.len(), 1);
    }

    #[tokio::test]
    async fn test_events() {
        let db = setup_db().await;

        let events = db.list_events().await.unwrap();
        assert_eq!(events.len(), 0);

        let calendar = Calendar {
            id: "calendar_test".to_string(),
            name: "test".to_string(),
            platform: Platform::Google,
        };

        db.upsert_calendar(calendar.clone()).await.unwrap();

        let event = Event {
            id: "event_test".to_string(),
            calendar_id: calendar.id,
            platform: Platform::Google,
            name: "test".to_string(),
            note: "test".to_string(),
            participants: vec![],
            start_date: time::OffsetDateTime::now_utc(),
            end_date: time::OffsetDateTime::now_utc(),
            google_event_url: None,
        };

        let event = db.upsert_event(event).await.unwrap();
        assert_eq!(event.calendar_id, "calendar_test");
        assert_eq!(event.participants, vec![]);
        assert_eq!(event.google_event_url, None);

        let events = db.list_events().await.unwrap();
        assert_eq!(events.len(), 1);
    }
}
