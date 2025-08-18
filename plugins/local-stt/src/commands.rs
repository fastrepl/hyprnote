use std::collections::HashMap;
use tauri::ipc::Channel;

use crate::{
    server::ServerType, LocalSttPluginExt, SttModelInfo, SupportedSttModel, SUPPORTED_MODELS,
};

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
pub async fn list_supported_models() -> Result<Vec<SttModelInfo>, String> {
    Ok(SUPPORTED_MODELS.iter().map(|m| m.info()).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: SupportedSttModel,
) -> Result<bool, String> {
    app.is_model_downloaded(&model)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloading<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: SupportedSttModel,
) -> Result<bool, String> {
    Ok(app.is_model_downloading(&model).await)
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: SupportedSttModel,
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
) -> Result<SupportedSttModel, String> {
    app.get_current_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: SupportedSttModel,
) -> Result<(), String> {
    app.set_current_model(model)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: Option<SupportedSttModel>,
) -> Result<String, String> {
    app.start_server(model).await.map_err(|e| e.to_string())
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

#[tauri::command]
#[specta::specta]
pub async fn get_servers<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<HashMap<ServerType, Option<String>>, String> {
    app.get_servers().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn list_supported_languages(model: SupportedSttModel) -> Vec<hypr_language::Language> {
    model.supported_languages()
}
