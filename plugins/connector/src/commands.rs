use crate::{Connection, ConnectionLLM, ConnectionSTT, ConnectorPluginExt};

#[tauri::command]
#[specta::specta]
pub async fn list_custom_llm_models<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.list_custom_llm_models()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_llm_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_custom_llm_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_llm_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: String,
) -> Result<(), String> {
    app.set_custom_llm_model(model).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_llm_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_custom_llm_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_llm_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_custom_llm_enabled(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<Connection>, String> {
    app.get_custom_llm_connection().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    connection: Connection,
) -> Result<(), String> {
    app.set_custom_llm_connection(connection)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_local_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ConnectionLLM, String> {
    app.get_local_llm_connection()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ConnectionLLM, String> {
    app.get_llm_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_stt_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ConnectionSTT, String> {
    app.get_stt_connection().await.map_err(|e| e.to_string())
}
