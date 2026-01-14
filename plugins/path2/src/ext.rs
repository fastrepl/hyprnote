use std::{collections::HashMap, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Manager;

pub struct Path2<'a, R: tauri::Runtime, M: Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

#[derive(Debug, Deserialize, specta::Type)]
pub struct ObsidianConfig {
    vaults: HashMap<String, ObsidianVault>,
}

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct ObsidianVault {
    pub path: PathBuf,
}

impl<'a, R: tauri::Runtime, M: Manager<R>> Path2<'a, R, M> {
    pub fn base(&self) -> Result<PathBuf, crate::Error> {
        let bundle_id: &str = self.manager.config().identifier.as_ref();
        let data_dir = self
            .manager
            .path()
            .data_dir()
            .map_err(|e| crate::Error::Path(e.to_string()))?;

        let app_folder = if cfg!(debug_assertions) || bundle_id == "com.hyprnote.staging" {
            bundle_id
        } else {
            "hyprnote"
        };

        let path = data_dir.join(app_folder);
        std::fs::create_dir_all(&path)?;
        Ok(path)
    }

    pub fn obsidian_vaults(&self) -> Result<Vec<ObsidianVault>, crate::Error> {
        let data_dir = self
            .manager
            .path()
            .data_dir()
            .map_err(|e| crate::Error::Path(e.to_string()))?;

        let config_path = data_dir.join("obsidian").join("obsidian.json");
        let content = std::fs::read_to_string(&config_path)?;
        let config: ObsidianConfig = serde_json::from_str(&content)?;

        Ok(config.vaults.into_values().collect())
    }
}

pub trait Path2PluginExt<R: tauri::Runtime> {
    fn path2(&self) -> Path2<'_, R, Self>
    where
        Self: Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: Manager<R>> Path2PluginExt<R> for T {
    fn path2(&self) -> Path2<'_, R, Self>
    where
        Self: Sized,
    {
        Path2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
