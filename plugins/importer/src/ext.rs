pub trait ImporterPluginExt<R: tauri::Runtime> {}

impl<R: tauri::Runtime, T: tauri::Manager<R> + Sync> ImporterPluginExt<R> for T {}
