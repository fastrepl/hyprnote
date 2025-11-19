use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// 123
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HooksConfig {
    /// 345
    pub version: u8,
    /// 678
    #[serde(default)]
    pub hooks: HashMap<String, Vec<HookDefinition>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct HookDefinition {
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

        let config: HooksConfig =
            serde_json::from_str(&content).map_err(|e| crate::Error::ConfigParse(e.to_string()))?;

        if config.version != 0 {
            return Err(crate::Error::UnsupportedVersion(config.version));
        }

        Ok(config)
    }

    fn config_path<R: tauri::Runtime>(app: &impl tauri::Manager<R>) -> crate::Result<PathBuf> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| crate::Error::ConfigLoad(e.to_string()))?;

        Ok(app_data_dir.join("hyprnote").join("hooks.json"))
    }

    fn empty() -> Self {
        Self {
            version: 0,
            hooks: HashMap::new(),
        }
    }
}
