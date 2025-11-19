pub trait HooksPluginExt<R: tauri::Runtime> {
    fn ping(&self, value: Option<String>) -> Result<Option<String>, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::HooksPluginExt<R> for T {
    fn ping(&self, value: Option<String>) -> Result<Option<String>, crate::Error> {
        Ok(value)
    }
}
