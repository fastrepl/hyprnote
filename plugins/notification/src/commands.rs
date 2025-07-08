use crate::NotificationPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_event_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_event_notification().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_event_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_event_notification(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_detect_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_detect_notification().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_detect_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_detect_notification(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn open_notification_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_notification_settings().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn request_notification_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_notification_permission()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_notification_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<hypr_notification2::NotificationPermission, String> {
    let permission = app
        .check_notification_permission()
        .await
        .map_err(|e| e.to_string())?;
    Ok(permission)
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn start_detect_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.start_detect_notification().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn stop_detect_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.stop_detect_notification().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn start_event_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.start_event_notification()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn stop_event_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.stop_event_notification().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_auto_record_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_auto_record_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_auto_record_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_auto_record_enabled(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_auto_record_threshold<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<f64, String> {
    app.get_auto_record_threshold().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_auto_record_threshold<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    threshold: f64,
) -> Result<(), String> {
    app.set_auto_record_threshold(threshold)
        .map_err(|e| e.to_string())
}
