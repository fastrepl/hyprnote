use crate::DeepLink2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(_app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok("pong".to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_available_deep_links<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<crate::DeepLinkInfo>, String> {
    Ok(app.get_available_deep_links())
}
