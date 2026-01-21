use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct ObsidianConfig {
    vaults: HashMap<String, ObsidianVault>,
}

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct ObsidianVault {
    pub path: PathBuf,
}

pub fn load_vaults() -> crate::Result<Vec<ObsidianVault>> {
    let data_dir = dirs::data_dir().ok_or_else(|| crate::Error::Path("data_dir".to_string()))?;
    let config_path = data_dir.join("obsidian").join("obsidian.json");
    let content = std::fs::read_to_string(&config_path)?;
    let config: ObsidianConfig = serde_json::from_str(&content)?;
    Ok(config.vaults.into_values().collect())
}
