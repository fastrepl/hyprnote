use crate::{LocalLlmPluginExt, Status};
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub async fn get_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<Status, String> {
    Ok(app.get_status().await)
}

#[tauri::command]
#[specta::specta]
pub async fn load_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    on_progress: tauri::ipc::Channel<u8>,
) -> Result<u8, String> {
    let data_dir = app.path().app_data_dir().unwrap();
    app.load_model(data_dir, on_progress).await
}

#[tauri::command]
#[specta::specta]
pub async fn unload_model<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.unload_model().await
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
