use crate::{LocalLlmPluginExt, ModelInfo, SupportedModel};

use tauri::ipc::Channel;

#[tauri::command]
#[specta::specta]
pub async fn models_dir<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok(app.models_dir().to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn list_supported_model() -> Result<Vec<ModelInfo>, String> {
    Ok(vec![
        ModelInfo {
            key: SupportedModel::HyprLLM,
            name: "HyprLLM".to_string(),
            description: "Experimental model trained by the Hyprnote team.".to_string(),
            size_bytes: SupportedModel::HyprLLM.model_size(),
        },
        ModelInfo {
            key: SupportedModel::Gemma3_4bQ4,
            name: "Gemma 3 4B Q4".to_string(),
            description: "General purpose model. Heavier than HyprLLM.".to_string(),
            size_bytes: SupportedModel::Gemma3_4bQ4.model_size(),
        },
        ModelInfo {
            key: SupportedModel::Llama3p2_3bQ4,
            name: "Llama 3.2 3B Q4".to_string(),
            description: "Not recommended. Exist only for backward compatibility.".to_string(),
            size_bytes: SupportedModel::Llama3p2_3bQ4.model_size(),
        },
    ])
}

#[tauri::command]
#[specta::specta]
pub async fn is_server_running<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.is_server_running().await
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: crate::SupportedModel,
) -> Result<bool, String> {
    app.is_model_downloaded(&model)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloading<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: crate::SupportedModel,
) -> Result<bool, String> {
    Ok(app.is_model_downloading(&model).await)
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: crate::SupportedModel,
    channel: Channel<i8>,
) -> Result<(), String> {
    app.download_model(model, channel)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.start_server().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_server().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn restart_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.stop_server().await.map_err(|e| e.to_string())?;
    app.start_server().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::SupportedModel, String> {
    app.get_current_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn list_downloaded_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<crate::SupportedModel>, String> {
    app.list_downloaded_model().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: crate::SupportedModel,
) -> Result<(), String> {
    app.set_current_model(model).map_err(|e| e.to_string())
}
