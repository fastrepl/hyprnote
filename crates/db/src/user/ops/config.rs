use anyhow::Result;

use super::UserDatabase;
use crate::user::{Config, ConfigKind};

impl UserDatabase {
    pub async fn get_config(&self, kind: ConfigKind) -> Result<Option<Config>> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM configs WHERE kind = ?",
                vec![kind.to_string()],
            )
            .await?;

        match rows.next().await? {
            Some(row) => Ok(Some(Config::from_row(&row)?)),
            None => Ok(None),
        }
    }

    pub async fn set_config(&self, config: Config) -> Result<()> {
        let (kind, data) = match config {
            Config::General { data } => (
                ConfigKind::General.to_string(),
                serde_json::to_string(&data)?,
            ),
            Config::Profile { data } => (
                ConfigKind::Profile.to_string(),
                serde_json::to_string(&data)?,
            ),
        };

        self.conn
            .execute(
                "INSERT OR REPLACE INTO configs (kind, data) VALUES (?, ?)",
                vec![kind, data],
            )
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::user::{ops::tests::setup_db, ConfigDataGeneral, ConfigDataProfile};

    use super::*;

    #[tokio::test]
    async fn test_profile_config() {
        let db = setup_db().await;

        let config = db.get_config(ConfigKind::Profile).await.unwrap();
        assert!(config.is_none());

        let _ = db
            .set_config(Config::Profile {
                data: ConfigDataProfile {
                    full_name: Some("John Doe".to_string()),
                    ..Default::default()
                },
            })
            .await;

        if let Some(Config::Profile { data }) = db.get_config(ConfigKind::Profile).await.unwrap() {
            assert_eq!(data.full_name, Some("John Doe".to_string()));
        } else {
            panic!("Config not found");
        }
    }

    #[tokio::test]
    async fn test_general_config() {
        let db = setup_db().await;

        let config = db.get_config(ConfigKind::General).await.unwrap();
        assert!(config.is_none());

        let config = ConfigDataGeneral {
            autostart: true,
            notifications: true,
            context: "work".to_string(),
            language: codes_iso_639::part_1::LanguageCode::Ko,
        };
        db.set_config(Config::General { data: config })
            .await
            .unwrap();

        let Some(Config::General { data }) = db.get_config(ConfigKind::General).await.unwrap()
        else {
            panic!("Config not found");
        };
        assert_eq!(data.context, "work");
    }
}
