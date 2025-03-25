use crate::LocalSttPluginExt;

use tauri::{ipc::Channel, Manager};

#[tauri::command]
#[specta::specta]
pub async fn is_server_running<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.is_server_running().await
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.is_model_downloaded().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: Channel<u8>,
) -> Result<(), String> {
    let base = app
        .path()
        .app_data_dir()
        .unwrap()
        .join("Demonthos/candle-quantized-whisper-large-v3-turbo/main/");

    app.download_config(base.join("config.json")).await.unwrap();
    app.download_tokenizer(base.join("tokenizer.json"))
        .await
        .unwrap();

    app.download_model(base.join("model.gguf"), channel)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.start_server().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_server().await.map_err(|e| e.to_string())
}
