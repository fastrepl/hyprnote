pub trait TracingPluginExt<R: tauri::Runtime> {
    fn hi(&self) -> Result<(), crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> TracingPluginExt<R> for T {
    fn hi(&self) -> Result<(), crate::Error> {
        Ok(())
    }
}
