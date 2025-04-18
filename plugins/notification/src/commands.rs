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
