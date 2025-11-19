use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HooksConfig {
    pub version: u8,
    #[serde(default)]
    pub hooks: HashMap<String, Vec<HookDefinition>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookDefinition {
    pub command: String,
}

impl HooksConfig {
    pub fn load<R: tauri::Runtime>(app: &impl tauri::Manager<R>) -> crate::Result<Self> {
        let path = Self::config_path(app)?;

        if !path.exists() {
            tracing::debug!("hooks.json not found at {:?}, returning empty config", path);
            return Ok(Self::empty());
        }

        let content = std::fs::read_to_string(&path).map_err(|e| {
            tracing::error!("failed to read hooks.json from {:?}: {}", path, e);
            crate::Error::ConfigLoad(e.to_string())
        })?;

        let config: HooksConfig = serde_json::from_str(&content).map_err(|e| {
            tracing::error!("failed to parse hooks.json: {}", e);
            crate::Error::ConfigParse(e.to_string())
        })?;

        if config.version != 0 {
            tracing::error!(
                "unsupported hooks.json version: {} (expected 0)",
                config.version
            );
            return Err(crate::Error::UnsupportedVersion(config.version));
        }

        tracing::debug!("loaded hooks.json with {} event types", config.hooks.len());
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
