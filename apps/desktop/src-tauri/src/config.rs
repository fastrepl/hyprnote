use serde::{Deserialize, Serialize};
use specta::Type;

use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum ConfigStore {
    V0(ConfigV0),
}

impl ConfigStore {
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Self>, String> {
        let Some(store) = app
            .store("store")
            .map(|s: std::sync::Arc<tauri_plugin_store::Store<R>>| s.get("config"))
            .map_err(|e| e.to_string())?
        else {
            return Ok(None);
        };

        serde_json::from_value(store).map_err(|e| e.to_string())
    }

    pub fn get<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Self>, String> {
        let Some(Some(store)) = app.get_store("store").map(|s| s.get("config")) else {
            return Ok(None);
        };

        serde_json::from_value(store).map_err(|e| e.to_string())
    }
}

impl Default for ConfigStore {
    fn default() -> Self {
        Self::V0(ConfigV0::default())
    }
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct ConfigV0 {
    pub version: u8,
    pub language: Language,
    pub user_name: String,
}

impl Default for ConfigV0 {
    fn default() -> Self {
        Self {
            version: 0,
            language: Language::default(),
            user_name: "You".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub enum Language {
    English,
    Korean,
}

impl Default for Language {
    fn default() -> Self {
        Self::English
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ConfigStore::default();
        match config {
            ConfigStore::V0(cfg_v0) => {
                assert_eq!(cfg_v0.version, 0);
            }
        }
    }
}
