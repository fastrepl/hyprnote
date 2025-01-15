use anyhow::Result;

use super::UserDatabase;
use crate::user::{Config, ConfigKind};

impl UserDatabase {
    pub async fn get_config(&self, kind: ConfigKind) -> Result<Config> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM configs WHERE kind = ?",
                vec![libsql::Value::Text(kind.to_string())],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let config: Config = libsql::de::from_row(&row)?;
        Ok(config)
    }
}
