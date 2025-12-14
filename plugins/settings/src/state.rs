use std::path::PathBuf;
use tokio::sync::RwLock;

use crate::Error;

pub struct SettingsState {
    path: PathBuf,
    lock: RwLock<()>,
}

impl SettingsState {
    pub fn new(base: PathBuf) -> Self {
        let path = base.join("settings.json");
        Self {
            path,
            lock: RwLock::new(()),
        }
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    async fn read_or_default(&self) -> crate::Result<serde_json::Value> {
        match tokio::fs::read_to_string(&self.path).await {
            Ok(content) => {
                serde_json::from_str(&content).map_err(|e| Error::Settings(format!("parse: {}", e)))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(serde_json::json!({})),
            Err(e) => Err(Error::Settings(format!("read: {}", e))),
        }
    }

    pub async fn load(&self) -> crate::Result<serde_json::Value> {
        let _guard = self.lock.read().await;
        self.read_or_default().await
    }

    pub async fn save(&self, settings: serde_json::Value) -> crate::Result<()> {
        let _guard = self.lock.write().await;

        if let Some(parent) = self.path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| Error::Settings(format!("create dir: {}", e)))?;
        }

        let existing = self.read_or_default().await?;

        let merged = match (existing, settings) {
            (serde_json::Value::Object(mut existing_map), serde_json::Value::Object(new_map)) => {
                for (key, value) in new_map {
                    existing_map.insert(key, value);
                }
                serde_json::Value::Object(existing_map)
            }
            (_, new) => new,
        };

        let tmp_path = self.path.with_extension("json.tmp");
        let content = serde_json::to_string_pretty(&merged)
            .map_err(|e| Error::Settings(format!("serialize: {}", e)))?;

        tokio::fs::write(&tmp_path, &content)
            .await
            .map_err(|e| Error::Settings(format!("write tmp: {}", e)))?;

        tokio::fs::rename(&tmp_path, &self.path)
            .await
            .map_err(|e| Error::Settings(format!("rename: {}", e)))?;

        Ok(())
    }
}
