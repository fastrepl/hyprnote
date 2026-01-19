use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub const FILENAME: &str = "settings.json";
pub const CONTENT_BASE_PATH_KEY: &str = "content_base_path";
pub const CONTENT_BASE_ENV_VAR: &str = "HYPRNOTE_CONTENT_BASE";

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
    pub fn default_base(&self) -> Result<PathBuf, crate::Error> {
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

    pub fn settings_base(&self) -> Result<PathBuf, crate::Error> {
        self.default_base()
    }

    pub fn content_base(&self) -> Result<PathBuf, crate::Error> {
        let state = self.manager.try_state::<crate::state::SettingsState>();
        if let Some(state) = state {
            return Ok(state.content_base().clone());
        }

        self.compute_content_base()
    }

    pub fn compute_content_base(&self) -> Result<PathBuf, crate::Error> {
        if let Ok(env_path) = std::env::var(CONTENT_BASE_ENV_VAR) {
            let path = PathBuf::from(&env_path);
            if path.exists() || std::fs::create_dir_all(&path).is_ok() {
                return Ok(path);
            }
            tracing::warn!(
                "HYPRNOTE_CONTENT_BASE path '{}' does not exist and could not be created, falling back to default",
                env_path
            );
        }

        let default_base = self.default_base()?;
        let settings_path = default_base.join(FILENAME);

        if let Ok(content) = std::fs::read_to_string(&settings_path)
            && let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content)
            && let Some(custom_base) = settings.get(CONTENT_BASE_PATH_KEY).and_then(|v| v.as_str())
        {
            let custom_path = PathBuf::from(custom_base);
            if custom_path.exists() {
                return Ok(custom_path);
            }
        }

        Ok(default_base)
    }

    pub async fn change_content_base(&self, new_path: PathBuf) -> Result<(), crate::Error> {
        let old_content_base = self.content_base()?;
        let default_base = self.default_base()?;

        if new_path == old_content_base {
            return Ok(());
        }

        std::fs::create_dir_all(&new_path)?;

        copy_dir_recursive(&old_content_base, &new_path).await?;

        let settings_path = default_base.join(FILENAME);
        let mut settings = if let Ok(content) = std::fs::read_to_string(&settings_path) {
            serde_json::from_str::<serde_json::Value>(&content).unwrap_or(serde_json::json!({}))
        } else {
            serde_json::json!({})
        };

        if let Some(obj) = settings.as_object_mut() {
            obj.insert(
                CONTENT_BASE_PATH_KEY.to_string(),
                serde_json::Value::String(new_path.to_string_lossy().to_string()),
            );
        }

        let tmp_path = settings_path.with_extension("for-content-base.tmp");
        let content = serde_json::to_string_pretty(&settings)?;
        std::fs::write(&tmp_path, &content)?;
        std::fs::rename(&tmp_path, &settings_path)?;

        if old_content_base != default_base {
            let _ = std::fs::remove_dir_all(&old_content_base);
        }

        Ok(())
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
        let base = self.settings_base()?;
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

async fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), crate::Error> {
    let mut entries = tokio::fs::read_dir(src).await?;

    while let Some(entry) = entries.next_entry().await? {
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if file_name == FILENAME {
            continue;
        }

        let file_type = entry.file_type().await?;
        if file_type.is_dir() {
            tokio::fs::create_dir_all(&dst_path).await?;
            Box::pin(copy_dir_recursive(&src_path, &dst_path)).await?;
        } else {
            tokio::fs::copy(&src_path, &dst_path).await?;
        }
    }

    Ok(())
}
