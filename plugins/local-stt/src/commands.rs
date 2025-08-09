use crate::{server::ServerType, LocalSttPluginExt};

use hypr_whisper_local_model::WhisperModel;
use tauri::ipc::Channel;

#[tauri::command]
#[specta::specta]
pub async fn models_dir<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok(app.models_dir().to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn list_ggml_backends<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Vec<hypr_whisper_local::GgmlBackend> {
    app.list_ggml_backends()
}

#[tauri::command]
#[specta::specta]
pub async fn list_supported_models() -> Result<Vec<WhisperModel>, String> {
    let models = vec![
        WhisperModel::QuantizedTiny,
        WhisperModel::QuantizedTinyEn,
        WhisperModel::QuantizedBase,
        WhisperModel::QuantizedBaseEn,
        WhisperModel::QuantizedSmall,
        WhisperModel::QuantizedSmallEn,
        WhisperModel::QuantizedLargeTurbo,
    ];

    Ok(models)
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: WhisperModel,
) -> Result<bool, String> {
    app.is_model_downloaded(&model)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloading<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: WhisperModel,
) -> Result<bool, String> {
    Ok(app.is_model_downloading(&model).await)
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: WhisperModel,
    channel: Channel<i8>,
) -> Result<(), String> {
    app.download_model(model, channel)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<WhisperModel, String> {
    app.get_current_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: WhisperModel,
) -> Result<(), String> {
    app.set_current_model(model).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    server_type: Option<ServerType>,
) -> Result<String, String> {
    app.start_server(server_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    server_type: Option<ServerType>,
) -> Result<bool, String> {
    app.stop_server(server_type)
        .await
        .map_err(|e| e.to_string())
}
