use anyhow::Result;
use time::format_description::well_known::Rfc3339;

#[allow(unused)]
use super::{Calendar, Event, Participant, Platform, Session};
use crate::Connection;

#[derive(Clone)]
pub struct UserDatabase {
    pub conn: Connection,
}

impl UserDatabase {
    pub fn from(conn: Connection) -> Self {
        Self { conn }
    }

    pub async fn get_session(&self, id: String) -> Result<Option<Session>> {
        let mut rows = self
            .conn
            .query("SELECT * FROM sessions WHERE id = ?", vec![id])
            .await
            .unwrap();

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let session: Session = libsql::de::from_row(&row)?;
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
            let item: Session = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn list_participants(&self, search: Option<&str>) -> Result<Vec<Participant>> {
        let mut rows = match search {
            Some(q) => self
                .conn
                .query(
                    "SELECT * FROM participants 
                    WHERE name LIKE ? OR email LIKE ?",
                    vec![format!("%{}%", q), format!("%{}%", q)],
                )
                .await
                .unwrap(),
            None => self
                .conn
                .query("SELECT * FROM participants", ())
                .await
                .unwrap(),
        };

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Participant = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
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

    pub async fn create_session(&self, session: Session) -> Result<Session> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO sessions (
                    id,
                    timestamp,
                    title,
                    raw_memo_html,
                    enhanced_memo_html,
                    tags,
                    transcript
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(session.id),
                    libsql::Value::Text(session.timestamp.format(&Rfc3339).unwrap()),
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

    pub async fn upsert_participant(&self, participant: Participant) -> Result<Participant> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO participants (
                    id,
                    name,
                    email,
                    color_hex
                ) VALUES (
                    :id,
                    :name,
                    :email,
                    :color_hex
                ) ON CONFLICT(email) DO UPDATE SET
                    name = :name,
                    color_hex = :color_hex
                RETURNING *",
                libsql::named_params! {
                    ":id": participant.id,
                    ":name": participant.name,
                    ":email": participant.email,
                    ":color_hex": participant.color_hex,
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let participant: Participant = libsql::de::from_row(&row)?;
        Ok(participant)
    }

    pub async fn upsert_calendar(&self, calendar: Calendar) -> Result<Calendar> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO calendars (
                    id,
                    tracking_id,
                    name,
                    platform
                ) VALUES (
                    :id,
                    :tracking_id,
                    :name,
                    :platform
                ) ON CONFLICT(tracking_id) DO UPDATE SET
                    name = :name,
                    platform = :platform
                RETURNING *",
                libsql::named_params! {
                    ":id": calendar.id,
                    ":tracking_id": calendar.tracking_id,
                    ":name": calendar.name,
                    ":platform": calendar.platform.to_string(),
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let calendar: Calendar = libsql::de::from_row(&row)?;
        Ok(calendar)
    }

    pub async fn upsert_event(&self, event: Event) -> Result<Event> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO calendar_events (
                    id,
                    tracking_id,
                    calendar_id,
                    platform,
                    name,
                    note,
                    start_date,
                    end_date,
                    google_event_url
                ) VALUES (
                    :id,
                    :tracking_id,
                    :calendar_id,
                    :platform,
                    :name,
                    :note,
                    :start_date,
                    :end_date,
                    :google_event_url
                ) ON CONFLICT(tracking_id) DO UPDATE SET
                    platform = :platform,
                    name = :name,
                    note = :note,
                    start_date = :start_date,
                    end_date = :end_date,
                    google_event_url = :google_event_url
                RETURNING *",
                libsql::named_params! {
                    ":id": event.id,
                    ":tracking_id": event.tracking_id,
                    ":calendar_id": event.calendar_id,
                    ":platform": event.platform.to_string(),
                    ":name": event.name,
                    ":note": event.note,
                    ":start_date": event.start_date.format(&Rfc3339).unwrap(),
                    ":end_date": event.end_date.format(&Rfc3339).unwrap(),
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
        user::{migrate, seed, Participant, Transcript},
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
    async fn test_participants() {
        let db = setup_db().await;

        let participants = db.list_participants(None).await.unwrap();
        assert_eq!(participants.len(), 0);

        let participant = Participant {
            name: "test".to_string(),
            email: "test@test.com".to_string(),
            ..Participant::default()
        };

        let p = db.upsert_participant(participant).await.unwrap();
        assert_eq!(p.name, "test");

        let participants = db.list_participants(None).await.unwrap();
        assert_eq!(participants.len(), 1);

        let participants = db.list_participants(Some("test")).await.unwrap();
        assert_eq!(participants.len(), 1);

        let participants = db
            .list_participants(Some("somethingnotindb"))
            .await
            .unwrap();
        assert_eq!(participants.len(), 0);
    }

    #[tokio::test]
    async fn test_sessions() {
        let db = setup_db().await;

        let sessions = db.list_sessions(None).await.unwrap();
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

        let sessions = db.list_sessions(Some("test")).await.unwrap();
        assert_eq!(sessions.len(), 1);
    }

    #[tokio::test]
    async fn test_calendars() {
        let db = setup_db().await;

        let calendars = db.list_calendars().await.unwrap();
        assert_eq!(calendars.len(), 0);

        let input_1 = Calendar {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "test".to_string(),
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
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "calendar_test".to_string(),
            name: "test".to_string(),
            platform: Platform::Google,
        };

        let calendar = db.upsert_calendar(calendar.clone()).await.unwrap();
        assert_eq!(calendar.tracking_id, "calendar_test");

        let event = Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "event_test".to_string(),
            calendar_id: calendar.id,
            platform: Platform::Google,
            name: "test".to_string(),
            note: "test".to_string(),
            start_date: time::OffsetDateTime::now_utc(),
            end_date: time::OffsetDateTime::now_utc(),
            google_event_url: None,
        };

        let event = db.upsert_event(event).await.unwrap();
        assert_eq!(event.tracking_id, "event_test");
        assert_eq!(event.google_event_url, None);

        let events = db.list_events().await.unwrap();
        assert_eq!(events.len(), 1);
    }
}
