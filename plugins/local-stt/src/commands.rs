use crate::LocalSttPluginExt;
use tauri::{ipc::Channel, Manager};

#[tauri::command]
#[specta::specta]
pub async fn is_server_running<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.is_server_running().await
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    let path = app.path().app_data_dir().unwrap().join("stt.gguf");
    path.exists()
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: Channel<u8>,
) -> Result<(), String> {
    let path = app.path().app_data_dir().unwrap().join("stt.gguf");
    app.download_model(path, channel).await
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();

    app.start_server(data_dir).await
}

#[tauri::command]
#[specta::specta]
pub async fn stop_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_server().await
}
