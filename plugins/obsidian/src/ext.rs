use tauri_plugin_store2::StorePluginExt;

pub trait ObsidianPluginExt<R: tauri::Runtime> {
    fn obsidian_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn ping(&self) -> Result<bool, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ObsidianPluginExt<R> for T {
    fn obsidian_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn ping(&self) -> Result<bool, String> {
        Ok(true)
    }
}
