use std::path::PathBuf;
use tokio::sync::RwLock;

use crate::Error;
use crate::ext::FILENAME;

pub struct SettingsState {
    path: PathBuf,
    content_base: PathBuf,
    lock: RwLock<()>,
}

impl SettingsState {
    pub fn new(settings_base: PathBuf, content_base: PathBuf) -> Self {
        let path = settings_base.join(FILENAME);
        Self {
            path,
            content_base,
            lock: RwLock::new(()),
        }
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    pub fn content_base(&self) -> &PathBuf {
        &self.content_base
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

        let tmp_path = self.path.with_extension("for-save.tmp");
        let content = serde_json::to_string_pretty(&merged)?;

        tokio::fs::write(&tmp_path, &content).await?;
        tokio::fs::rename(&tmp_path, &self.path).await?;

        Ok(())
    }

    pub fn reset(&self) -> crate::Result<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let tmp_path = self.path.with_extension("for-reset.tmp");
        std::fs::write(&tmp_path, "{}")?;
        std::fs::rename(&tmp_path, &self.path)?;
        Ok(())
    }
}
