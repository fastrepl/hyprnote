use std::path::PathBuf;
use tokio::sync::RwLock;

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

    pub async fn load(&self) -> Result<serde_json::Value, String> {
        let _guard = self.lock.read().await;

        match tokio::fs::read_to_string(&self.path).await {
            Ok(content) => serde_json::from_str(&content).map_err(|e| format!("parse: {}", e)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(serde_json::json!({})),
            Err(e) => Err(format!("read: {}", e)),
        }
    }

    pub async fn save(&self, settings: serde_json::Value) -> Result<(), String> {
        let _guard = self.lock.write().await;

        if let Some(parent) = self.path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("create dir: {}", e))?;
        }

        let tmp_path = self.path.with_extension("json.tmp");
        let content =
            serde_json::to_string_pretty(&settings).map_err(|e| format!("serialize: {}", e))?;

        tokio::fs::write(&tmp_path, &content)
            .await
            .map_err(|e| format!("write tmp: {}", e))?;

        tokio::fs::rename(&tmp_path, &self.path)
            .await
            .map_err(|e| format!("rename: {}", e))?;

        Ok(())
    }
}
