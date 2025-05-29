use crate::AnalyticsPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn event<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    payload: hypr_analytics::AnalyticsPayload,
) -> Result<(), String> {
    app.event(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_disabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    disabled: bool,
) -> Result<(), String> {
    app.set_disabled(disabled).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_disabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.is_disabled().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_queue_size<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<usize, String> {
    app.get_queue_size().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn flush_queue<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.flush_queue().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn clear_queue<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.clear_queue().map_err(|e| e.to_string())
}
