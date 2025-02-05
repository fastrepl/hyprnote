use super::UserDatabase;
use crate::user::Calendar;

impl UserDatabase {
    pub async fn list_calendars(&self) -> Result<Vec<Calendar>, crate::Error> {
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

    pub async fn upsert_calendar(&self, calendar: Calendar) -> Result<Calendar, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO calendars (
                    id,
                    tracking_id,
                    name,
                    platform,
                    selected
                ) VALUES (
                    :id,
                    :tracking_id,
                    :name,
                    :platform,
                    :selected
                ) ON CONFLICT(tracking_id) DO UPDATE SET
                    name = :name,
                    platform = :platform,
                    selected = :selected
                RETURNING *",
                libsql::named_params! {
                    ":id": calendar.id,
                    ":tracking_id": calendar.tracking_id,
                    ":name": calendar.name,
                    ":platform": calendar.platform.to_string(),
                    ":selected": calendar.selected,
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let calendar: Calendar = libsql::de::from_row(&row)?;
        Ok(calendar)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::{ops::tests::setup_db, Platform};

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
            selected: false,
        };

        let output_1 = db.upsert_calendar(input_1.clone()).await.unwrap();
        assert_eq!(output_1, input_1);

        let output_2 = db.upsert_calendar(input_1.clone()).await.unwrap();
        assert_eq!(output_2, input_1);

        let calendars = db.list_calendars().await.unwrap();
        assert_eq!(calendars.len(), 1);
    }
}
