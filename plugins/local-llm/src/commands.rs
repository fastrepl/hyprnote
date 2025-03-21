use crate::{LocalLlmPluginExt, Status};
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub async fn get_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<Status, String> {
    Ok(app.get_status().await)
}

#[tauri::command]
#[specta::specta]
pub async fn load_model<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let model_path = app.path().app_data_dir().unwrap().join("llm.gguf");
    app.load_model(model_path).await.map_err(|e| e.to_string())
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
