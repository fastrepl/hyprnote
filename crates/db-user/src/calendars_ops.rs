use super::{Calendar, UserDatabase};

impl UserDatabase {
    pub async fn get_calendar(
        &self,
        id: impl AsRef<str>,
    ) -> Result<Option<Calendar>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query("SELECT * FROM calendars WHERE id = ?", vec![id.as_ref()])
            .await?;

        match rows.next().await? {
            Some(row) => {
                let calendar: Calendar = libsql::de::from_row(&row)?;
                Ok(Some(calendar))
            }
            None => Ok(None),
        }
    }

    pub async fn list_calendars(
        &self,
        user_id: impl AsRef<str>,
    ) -> Result<Vec<Calendar>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM calendars WHERE user_id = ?",
                vec![user_id.as_ref()],
            )
            .await
            .unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Calendar = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn list_calendars_by_user_id(
        &self,
        user_id: impl AsRef<str>,
    ) -> Result<Vec<Calendar>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM calendars WHERE user_id = ?",
                vec![user_id.as_ref()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: Calendar = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn delete_calendar(&self, calendar_id: impl AsRef<str>) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute(
            "DELETE FROM calendars WHERE id = ?",
            vec![calendar_id.as_ref()],
        )
        .await?;

        Ok(())
    }

    pub async fn upsert_calendar(&self, calendar: Calendar) -> Result<Calendar, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT INTO calendars (
                    id,
                    tracking_id,
                    user_id,
                    name,
                    platform,
                    selected,
                    source,
                    connection_status,
                    account_id,
                    last_sync_error,
                    last_sync_at
                ) VALUES (
                    :id,
                    :tracking_id,
                    :user_id,
                    :name,
                    :platform,
                    :selected,
                    :source,
                    :connection_status,
                    :account_id,
                    :last_sync_error,
                    :last_sync_at
                ) ON CONFLICT(tracking_id) DO UPDATE SET
                    name = :name,
                    platform = :platform,
                    source = :source,
                    connection_status = :connection_status,
                    account_id = :account_id,
                    last_sync_error = :last_sync_error,
                    last_sync_at = :last_sync_at
                RETURNING *",
                libsql::named_params! {
                    ":id": calendar.id,
                    ":tracking_id": calendar.tracking_id,
                    ":user_id": calendar.user_id,
                    ":name": calendar.name,
                    ":platform": calendar.platform.to_string(),
                    ":selected": calendar.selected,
                    ":source": calendar.source,
                    ":connection_status": calendar.connection_status,
                    ":account_id": calendar.account_id,
                    ":last_sync_error": calendar.last_sync_error,
                    ":last_sync_at": calendar.last_sync_at,
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let calendar: Calendar = libsql::de::from_row(&row)?;
        Ok(calendar)
    }

    pub async fn toggle_calendar_selected(
        &self,
        tracking_id: impl AsRef<str>,
    ) -> Result<Calendar, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "UPDATE calendars 
                SET selected = NOT selected 
                WHERE tracking_id = ?
                RETURNING *",
                vec![tracking_id.as_ref()],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let calendar: Calendar = libsql::de::from_row(&row)?;
        Ok(calendar)
    }

    pub async fn update_calendar_sync_status(
        &self,
        tracking_id: impl AsRef<str>,
        connection_status: impl AsRef<str>,
        sync_error: Option<String>,
        sync_time: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute(
            "UPDATE calendars SET connection_status = ?, last_sync_error = ?, last_sync_at = ? WHERE tracking_id = ?",
            vec![
                connection_status.as_ref(),
                sync_error.as_deref().unwrap_or_default(),
                sync_time.as_ref(),
                tracking_id.as_ref(),
            ],
        )
        .await?;

        Ok(())
    }

    pub async fn get_calendars_needing_reconnection(
        &self,
        user_id: impl AsRef<str>,
    ) -> Result<Vec<Calendar>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM calendars WHERE user_id = ? AND connection_status = 'needs_reconnection'",
                vec![user_id.as_ref()],
            )
            .await?;

        let mut calendars = Vec::new();
        while let Some(row) = rows.next().await? {
            let calendar: Calendar = libsql::de::from_row(&row)?;
            calendars.push(calendar);
        }
        Ok(calendars)
    }
}

#[cfg(test)]
mod tests {
    use crate::{tests::setup_db, Calendar, Human, Platform};

    #[tokio::test]
    async fn test_calendars() {
        let db = setup_db().await;

        let calendars = db
            .list_calendars(uuid::Uuid::new_v4().to_string())
            .await
            .unwrap();
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
            user_id: human.id.clone(),
            name: "test".to_string(),
            platform: Platform::Google,
            selected: false,
            source: None,
        };

        let output_1 = db.upsert_calendar(input_1.clone()).await.unwrap();
        assert_eq!(output_1, input_1);

        let output_2 = db.upsert_calendar(input_1.clone()).await.unwrap();
        assert_eq!(output_2, input_1);

        let calendars = db.list_calendars(&human.id).await.unwrap();
        assert_eq!(calendars.len(), 1);
    }
}
