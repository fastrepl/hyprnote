pub trait ImporterPluginExt<R: tauri::Runtime> {
    fn ping(&self) -> Result<String, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ImporterPluginExt<R> for T {
    fn ping(&self) -> Result<String, String> {
        Ok("pong".to_string())
    }
}
