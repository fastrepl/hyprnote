use crate::NotifyPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn start<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.notify().start().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.notify().stop().map_err(|e| e.to_string())
}
