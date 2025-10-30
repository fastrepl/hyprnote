pub trait DetectPluginExt<R: tauri::Runtime> {}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DetectPluginExt<R> for T {}
