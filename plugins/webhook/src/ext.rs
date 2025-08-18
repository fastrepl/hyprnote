pub trait WebhookPluginExt<R: tauri::Runtime> {
    fn todo(&self) -> Result<String, String>;
}

impl<R: tauri::Runtime> WebhookPluginExt<R> for tauri::AppHandle<R> {
    fn todo(&self) -> Result<String, String> {
        Ok("Webhook todo functionality not yet implemented".to_string())
    }
}
