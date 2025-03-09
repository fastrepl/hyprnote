pub trait StorePluginExt<R: tauri::Runtime> {}

impl<R: tauri::Runtime, T: tauri::Manager<R>> StorePluginExt<R> for T {}
