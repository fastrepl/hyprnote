use crate::OAuth2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_base_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_base_url().map_err(|e| e.to_string())
}
