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
pub(crate) async fn set_properties<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    payload: hypr_analytics::PropertiesPayload,
) -> Result<(), String> {
    app.set_properties(payload).await.map_err(|e| e.to_string())
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
