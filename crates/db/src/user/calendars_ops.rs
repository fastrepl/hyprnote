use super::{Calendar, UserDatabase};

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
                    user_id,
                    name,
                    platform,
                    selected
                ) VALUES (
                    :id,
                    :tracking_id,
                    :user_id,
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
                    ":user_id": calendar.user_id,
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
    use crate::user::{tests::setup_db, Calendar, Human, Platform};

    #[tokio::test]
    async fn test_calendars() {
        let db = setup_db().await;

        let calendars = db.list_calendars().await.unwrap();
        assert_eq!(calendars.len(), 0);

        let human = db
            .upsert_human(Human {
                full_name: Some("yujonglee".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let input_1 = Calendar {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "test".to_string(),
            user_id: human.id,
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
