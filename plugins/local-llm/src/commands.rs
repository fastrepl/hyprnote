use crate::LocalLlmPluginExt;
use tauri::{ipc::Channel, Manager};

#[tauri::command]
#[specta::specta]
pub async fn is_server_running<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    let s = app.get_status().await;
    s.server_running
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_loaded<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    let s = app.get_status().await;
    s.model_loaded
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    let path = app.path().app_data_dir().unwrap().join("llm.gguf");
    path.exists()
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: Channel<u8>,
) -> Result<(), String> {
    let path = app.path().app_data_dir().unwrap().join("llm.gguf");
    app.download_model(path, channel).await
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
