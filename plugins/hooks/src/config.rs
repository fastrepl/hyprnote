use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use tauri_plugin_settings::SettingsPluginExt;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HooksConfig {
    pub version: u8,
    #[serde(default)]
    pub on: HashMap<String, Vec<HookDefinition>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HookDefinition {
    pub command: String,
}

impl HooksConfig {
    pub async fn load<R: tauri::Runtime>(app: &impl tauri::Manager<R>) -> crate::Result<Self> {
        let settings = app
            .settings()
            .load()
            .await
            .map_err(|e| crate::Error::ConfigLoad(e.to_string()))?;

        let Some(hooks_value) = settings.get("hooks").cloned() else {
            return Ok(Self::empty());
        };

        let config: HooksConfig = serde_json::from_value(hooks_value)
            .map_err(|e| crate::Error::ConfigParse(e.to_string()))?;

        if config.version != 0 {
            return Err(crate::Error::UnsupportedVersion(config.version));
        }

        Ok(config)
    }

    fn empty() -> Self {
        Self {
            version: 0,
            on: HashMap::new(),
        }
    }
}
