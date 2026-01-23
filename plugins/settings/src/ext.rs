use std::path::PathBuf;

use crate::content_base;
use crate::obsidian::ObsidianVault;

pub const FILENAME: &str = "settings.json";

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
            .map_err(|_| crate::Error::DataDirUnavailable)?;

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

    pub fn settings_path(&self) -> Result<PathBuf, crate::Error> {
        let base = self.settings_base()?;
        Ok(base.join(FILENAME))
    }

    pub fn content_base(&self) -> Result<PathBuf, crate::Error> {
        let state = self.manager.try_state::<crate::state::State>();
        if let Some(state) = state {
            return Ok(state.content_base().clone());
        }

        self.compute_content_base()
    }

    pub fn compute_content_base(&self) -> Result<PathBuf, crate::Error> {
        let default_base = self.default_base()?;
        let settings_path = self.settings_base()?;
        let custom_base = content_base::resolve_custom(&settings_path, &default_base);
        Ok(custom_base.unwrap_or(default_base))
    }

    pub fn obsidian_vaults(&self) -> Result<Vec<ObsidianVault>, crate::Error> {
        crate::obsidian::load_vaults()
    }

    pub async fn load(&self) -> crate::Result<serde_json::Value> {
        let state = self.manager.state::<crate::state::State>();
        state.load().await
    }

    pub async fn save(&self, settings: serde_json::Value) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::State>();
        state.save(settings).await
    }

    pub fn reset(&self) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::State>();
        state.reset()
    }
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R> + tauri::Emitter<R>> Settings<'a, R, M> {
    pub async fn change_content_base(&self, new_path: PathBuf) -> Result<(), crate::Error> {
        let old_content_base = self.content_base()?;
        let default_base = self.default_base()?;

        if new_path == old_content_base {
            return Ok(());
        }

        content_base::validate_content_base_change(&old_content_base, &new_path)?;

        std::thread::sleep(std::time::Duration::from_millis(500));

        std::fs::create_dir_all(&new_path)?;
        crate::fs::copy_content_items(&old_content_base, &new_path).await?;

        let settings_path = default_base.join(FILENAME);
        let existing_json = std::fs::read_to_string(&settings_path).ok();
        let content = content_base::prepare_settings_json_for_content_base(
            existing_json.as_deref(),
            &new_path,
        )?;

        crate::fs::atomic_write(&settings_path, &content)?;

        if old_content_base != default_base {
            let _ = std::fs::remove_dir_all(&old_content_base);
        }

        Ok(())
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
