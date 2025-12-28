use crate::AuthPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_item<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
) -> Result<Option<String>, String> {
    app.get_item(key).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_item<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
    value: String,
) -> Result<(), String> {
    app.set_item(key, value).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn remove_item<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
) -> Result<(), String> {
    app.remove_item(key).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn clear<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.clear_auth().map_err(|e| e.to_string())
}
