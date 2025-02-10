use super::UserDatabase;
use crate::user::Config;

impl UserDatabase {
    pub async fn get_config(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Option<Config>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM configs WHERE user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let config = libsql::de::from_row(&row)?;
                Ok(Some(config))
            }
        }
    }

    pub async fn set_config(
        &self,
        user_id: impl Into<String>,
        config: Config,
    ) -> Result<(), crate::Error> {
        self.conn
            .execute(
                "INSERT OR REPLACE INTO configs (
                    user_id,
                    general,
                    notification
                ) VALUES (?, ?, ?)",
                vec![
                    user_id.into(),
                    serde_json::to_string(&config.general)?,
                    serde_json::to_string(&config.notification)?,
                ],
            )
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::user::{tests::setup_db, Config, ConfigGeneral};

    #[tokio::test]
    async fn test_config() {
        let _db = setup_db().await;

        // TODO: need user

        // db.set_config(Config::default()).await.unwrap();
        // let config = db.get_config().await.unwrap().unwrap();
        // assert_eq!(config.general, ConfigGeneral::default());
    }
}
