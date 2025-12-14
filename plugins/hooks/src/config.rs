use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Configuration for hook execution.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HooksConfig {
    /// Configuration schema version.
    pub version: u8,
    /// Map of event names to their associated hook definitions.
    #[serde(default)]
    pub hooks: HashMap<String, Vec<HookDefinition>>,
}

/// Defines a single hook to be executed on an event.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HookDefinition {
    /// Shell command to execute when the hook is triggered.
    pub command: String,
}

impl HooksConfig {
    pub fn load<R: tauri::Runtime>(app: &impl tauri::Manager<R>) -> crate::Result<Self> {
        let path = Self::config_path(app)?;

        if !path.exists() {
            return Ok(Self::empty());
        }

        let content =
            std::fs::read_to_string(&path).map_err(|e| crate::Error::ConfigLoad(e.to_string()))?;

        let settings: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| crate::Error::ConfigParse(e.to_string()))?;

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

    fn config_path<R: tauri::Runtime>(app: &impl tauri::Manager<R>) -> crate::Result<PathBuf> {
        let data_dir = app
            .path()
            .data_dir()
            .map_err(|e| crate::Error::ConfigLoad(e.to_string()))?;

        Ok(data_dir.join("hyprnote").join("settings.json"))
    }

    fn empty() -> Self {
        Self {
            version: 0,
            hooks: HashMap::new(),
        }
    }
}
