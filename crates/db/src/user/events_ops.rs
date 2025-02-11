use super::{Event, Human, UserDatabase};

impl UserDatabase {
    pub async fn get_event(&self, id: impl Into<String>) -> Result<Option<Event>, crate::Error> {
        let mut rows = self
            .conn
            .query("SELECT * FROM events WHERE id = ?", vec![id.into()])
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let event: Event = libsql::de::from_row(&row)?;
                Ok(Some(event))
            }
        }
    }

    pub async fn upsert_event(&self, event: Event) -> Result<Event, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO events (
                    id,
                    user_id,
                    tracking_id,
                    calendar_id,
                    name,
                    note,
                    start_date,
                    end_date,
                    google_event_url
                ) VALUES (
                    :id,
                    :user_id,
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
                    ":user_id": event.user_id,
                    ":tracking_id": event.tracking_id,
                    ":calendar_id": event.calendar_id,
                    ":name": event.name,
                    ":note": event.note,
                    ":start_date": event.start_date.to_rfc3339(),
                    ":end_date": event.end_date.to_rfc3339(),
                    ":google_event_url": event.google_event_url,
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let event: Event = libsql::de::from_row(&row)?;
        Ok(event)
    }

    pub async fn list_events(&self) -> Result<Vec<Event>, crate::Error> {
        let mut rows = self.conn.query("SELECT * FROM events", ()).await.unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Event = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn list_participants(
        &self,
        event_id: impl Into<String>,
    ) -> Result<Vec<Human>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT h.* 
                FROM humans h 
                JOIN event_participants ep ON h.id = ep.human_id
                WHERE ep.event_id = ?",
                vec![event_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Human = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn add_participant(
        &self,
        event_id: impl Into<String>,
        human_id: impl Into<String>,
    ) -> Result<(), crate::Error> {
        self.conn
            .query(
                "INSERT OR IGNORE INTO event_participants (event_id, human_id) VALUES (?, ?)",
                (event_id.into(), human_id.into()),
            )
            .await?;

        Ok(())
    }

    pub async fn remove_participant(
        &self,
        event_id: impl Into<String>,
        human_id: impl Into<String>,
    ) -> Result<(), crate::Error> {
        self.conn
            .query(
                "DELETE FROM event_participants WHERE event_id = ? AND human_id = ?",
                (event_id.into(), human_id.into()),
            )
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::{tests::setup_db, Calendar, Platform};

    #[tokio::test]
    async fn test_events() {
        let db = setup_db().await;

        let events = db.list_events().await.unwrap();
        assert_eq!(events.len(), 0);

        let human = db
            .upsert_human(Human {
                full_name: Some("yujonglee".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let calendar = Calendar {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "calendar_test".to_string(),
            user_id: human.id,
            name: "test".to_string(),
            platform: Platform::Google,
            selected: false,
        };

        let calendar = db.upsert_calendar(calendar.clone()).await.unwrap();
        assert_eq!(calendar.tracking_id, "calendar_test");

        let human = db
            .upsert_human(Human {
                full_name: Some("yujonglee".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let event = Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: human.id,
            tracking_id: "event_test".to_string(),
            calendar_id: calendar.id,
            name: "test".to_string(),
            note: "test".to_string(),
            start_date: chrono::Utc::now(),
            end_date: chrono::Utc::now(),
            google_event_url: None,
        };

        let event = db.upsert_event(event).await.unwrap();
        assert_eq!(event.tracking_id, "event_test");
        assert_eq!(event.google_event_url, None);

        let events = db.list_events().await.unwrap();
        assert_eq!(events.len(), 1);
    }
}
