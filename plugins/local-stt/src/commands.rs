use crate::LocalSttPluginExt;

use tauri::ipc::Channel;

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
    app.is_model_downloaded(model)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloading<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    Ok(app.is_model_downloading().await)
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: crate::SupportedModel,
    channel: Channel<u8>,
) -> Result<(), String> {
    app.download_model(model, channel)
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

#[tauri::command]
#[specta::specta]
pub fn get_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::SupportedModel, String> {
    app.get_current_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_current_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: crate::SupportedModel,
) -> Result<(), String> {
    app.set_current_model(model).map_err(|e| e.to_string())
}
