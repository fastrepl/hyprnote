pub trait SettingsPluginExt<R: tauri::Runtime> {}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::SettingsPluginExt<R> for T {}
