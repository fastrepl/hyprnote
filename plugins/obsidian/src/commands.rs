use crate::ObsidianPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_configured<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.is_configured().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.set_api_key(api_key).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_base_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    base_url: String,
) -> Result<(), String> {
    app.set_base_url(base_url).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_api_key().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_base_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_base_url().map_err(|e| e.to_string())
}
