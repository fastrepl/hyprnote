pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn ping(&self) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
    fn ping(&self) -> Result<(), String> {
        Ok(())
    }
}
