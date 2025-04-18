use crate::NotificationPluginExt;

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
