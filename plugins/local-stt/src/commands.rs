use crate::{LocalSttPluginExt, Status};

#[tauri::command]
#[specta::specta]
pub async fn get_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<Status, String> {
    Ok(app.get_status().await)
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.start_server().await
}

#[tauri::command]
#[specta::specta]
pub async fn stop_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_server().await
}
