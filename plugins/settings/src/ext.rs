use std::path::PathBuf;

use tauri_plugin_path2::Path2PluginExt;

pub const FILENAME: &str = "settings.json";

pub fn settings_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<PathBuf, crate::Error> {
    let base = app.path2().base()?;
    Ok(base.join(FILENAME))
}

pub struct Settings<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Settings<'a, R, M> {
    pub fn path(&self) -> Result<PathBuf, crate::Error> {
        settings_path(self.manager.app_handle())
    }

    pub async fn load(&self) -> crate::Result<serde_json::Value> {
        let state = self.manager.state::<crate::state::SettingsState>();
        state.load().await
    }

    pub async fn save(&self, settings: serde_json::Value) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::SettingsState>();
        state.save(settings).await
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
