use anyhow::Result;
use time::format_description::well_known::Rfc3339;

use super::UserDatabase;
use crate::user::{Event, Participant, ParticipantFilter};

impl UserDatabase {
    pub async fn get_event(&self, id: String) -> Result<Event> {
        let mut rows = self
            .conn
            .query("SELECT * FROM calendar_events WHERE id = ?", vec![id])
            .await?;

        let row = rows.next().await?.unwrap();
        let event: Event = libsql::de::from_row(&row)?;
        Ok(event)
    }

    pub async fn list_participants(&self, filter: ParticipantFilter) -> Result<Vec<Participant>> {
        let mut rows = match filter {
            ParticipantFilter::Text(q) => {
                self.conn
                    .query(
                        "SELECT * FROM participants WHERE name LIKE ? OR email LIKE ?",
                        vec![format!("%{}%", q), format!("%{}%", q)],
                    )
                    .await?
            }
            ParticipantFilter::Event(e) => {
                self.conn
                    .query(
                        "SELECT p.* FROM participants p
                         JOIN event_participants ep ON p.id = ep.participant_id
                         WHERE ep.event_id = ?",
                        vec![e],
                    )
                    .await?
            }
            ParticipantFilter::All => self.conn.query("SELECT * FROM participants", ()).await?,
        };

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Participant = libsql::de::from_row(&row)?;
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

    pub async fn event_set_participants(
        &self,
        event_id: String,
        participant_ids: Vec<String>,
    ) -> Result<()> {
        self.conn
            .query(
                "DELETE FROM event_participants WHERE event_id = ?",
                vec![event_id.clone()],
            )
            .await?;

        for participant_id in participant_ids {
            self.conn
                .query(
                    "INSERT INTO event_participants (event_id, participant_id) VALUES (?, ?)",
                    vec![event_id.clone(), participant_id],
                )
                .await?;
        }

        Ok(())
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
                ) ON CONFLICT(id) DO UPDATE SET
                    name = :name,
                    email = :email,
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

    pub async fn upsert_event(&self, event: Event) -> Result<Event> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO calendar_events (
                    id,
                    tracking_id,
                    calendar_id,
                    name,
                    note,
                    start_date,
                    end_date,
                    google_event_url
                ) VALUES (
                    :id,
                    :tracking_id,
                    :calendar_id,
                    :name,
                    :note,
                    :start_date,
                    :end_date,
                    :google_event_url
                ) ON CONFLICT(tracking_id) DO UPDATE SET
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
    use crate::user::{ops::tests::setup_db, Calendar, Platform};

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
            selected: false,
        };

        let calendar = db.upsert_calendar(calendar.clone()).await.unwrap();
        assert_eq!(calendar.tracking_id, "calendar_test");

        let event = Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "event_test".to_string(),
            calendar_id: calendar.id,
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

    #[tokio::test]
    async fn test_participants() {
        let db = setup_db().await;

        let participants = db.list_participants(ParticipantFilter::All).await.unwrap();
        assert_eq!(participants.len(), 0);

        let participant = Participant {
            name: "test".to_string(),
            email: Some("test@test.com".to_string()),
            ..Participant::default()
        };

        let p = db.upsert_participant(participant).await.unwrap();
        assert_eq!(p.name, "test");

        let participants = db.list_participants(ParticipantFilter::All).await.unwrap();
        assert_eq!(participants.len(), 1);

        let participants = db
            .list_participants(ParticipantFilter::Text("test".to_string()))
            .await
            .unwrap();
        assert_eq!(participants.len(), 1);

        let participants = db
            .list_participants(ParticipantFilter::Text("somethingnotindb".to_string()))
            .await
            .unwrap();
        assert_eq!(participants.len(), 0);
    }
}
