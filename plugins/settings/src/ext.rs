use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

pub const FILENAME: &str = "settings.json";

#[derive(Debug, Deserialize, specta::Type)]
pub struct ObsidianConfig {
    vaults: HashMap<String, ObsidianVault>,
}

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct ObsidianVault {
    pub path: PathBuf,
}

pub struct Settings<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Settings<'a, R, M> {
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

    pub fn path(&self) -> Result<PathBuf, crate::Error> {
        let base = self.base()?;
        Ok(base.join(FILENAME))
    }

    pub async fn load(&self) -> crate::Result<serde_json::Value> {
        let state = self.manager.state::<crate::state::SettingsState>();
        state.load().await
    }

    pub async fn save(&self, settings: serde_json::Value) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::SettingsState>();
        state.save(settings).await
    }

    pub fn reset(&self) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::SettingsState>();
        state.reset()
    }
}

pub trait SettingsPluginExt<R: tauri::Runtime> {
    fn settings(&self) -> Settings<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> SettingsPluginExt<R> for T {
    fn settings(&self) -> Settings<'_, R, Self>
    where
        Self: Sized,
    {
        Settings {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
