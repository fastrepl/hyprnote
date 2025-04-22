use crate::{ConnectionType, ConnectorPluginExt};

#[tauri::command]
#[specta::specta]
pub async fn get_api_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    t: ConnectionType,
) -> Result<Option<String>, String> {
    app.get_api_base(t).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    t: ConnectionType,
) -> Result<Option<String>, String> {
    app.get_api_key(t).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_openai_api_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_custom_openai_api_base().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_openai_api_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_base: String,
) -> Result<(), String> {
    app.set_custom_openai_api_base(api_base)
        .map_err(|e| e.to_string())
}
