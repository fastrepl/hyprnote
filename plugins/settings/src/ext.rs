use std::path::PathBuf;

pub struct Settings<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Settings<'a, R, M> {
    pub fn path(&self) -> PathBuf {
        let state = self.manager.state::<crate::state::SettingsState>();
        state.path().clone()
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
