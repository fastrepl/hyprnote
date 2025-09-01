use std::collections::HashMap;
use tauri::ipc::Channel;

use crate::{
    server::{ServerHealth, ServerType},
    LocalSttPluginExt, SttModelInfo, SupportedSttModel, SUPPORTED_MODELS,
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
pub fn get_local_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<SupportedSttModel, String> {
    app.get_local_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_local_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: SupportedSttModel,
) -> Result<(), String> {
    app.set_local_model(model).await.map_err(|e| e.to_string())
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
) -> Result<HashMap<ServerType, ServerHealth>, String> {
    app.get_servers().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn list_supported_languages(model: SupportedSttModel) -> Vec<hypr_language::Language> {
    model.supported_languages()
}

#[tauri::command]
#[specta::specta]
pub fn get_custom_base_url<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.get_custom_base_url().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_custom_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_custom_api_key().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_custom_base_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    base_url: String,
) -> Result<(), String> {
    app.set_custom_base_url(base_url).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_custom_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.set_custom_api_key(api_key).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_provider<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::Provider, String> {
    app.get_provider().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_provider<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    provider: crate::Provider,
) -> Result<(), String> {
    app.set_provider(provider).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_custom_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<SupportedSttModel>, String> {
    app.get_custom_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_custom_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: SupportedSttModel,
) -> Result<(), String> {
    app.set_custom_model(model).map_err(|e| e.to_string())
}
