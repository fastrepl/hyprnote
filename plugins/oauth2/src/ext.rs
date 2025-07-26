pub trait OAuth2PluginExt<R: tauri::Runtime> {
    fn get_base_url(&self) -> Result<Option<String>, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> OAuth2PluginExt<R> for T {
    fn get_base_url(&self) -> Result<Option<String>, crate::Error> {
        Ok(None)
    }
}
