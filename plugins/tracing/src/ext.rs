use std::path::PathBuf;

pub trait TracingPluginExt<R: tauri::Runtime> {
    fn logs_dir(&self, bundle_id: impl Into<String>) -> Result<PathBuf, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> TracingPluginExt<R> for T {
    fn logs_dir(&self, bundle_id: impl Into<String>) -> Result<PathBuf, crate::Error> {
        let base_dir = dirs::data_dir().unwrap();
        let logs_dir = base_dir.join(bundle_id.into()).join("logs");
        let _ = std::fs::create_dir_all(&logs_dir);
        Ok(logs_dir)
    }
}
