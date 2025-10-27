use crate::NotificationPluginExt;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct DetectNotificationParams {
    pub respect_do_not_disturb: bool,
    pub ignored_platforms: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct EventNotificationParams {
    pub respect_do_not_disturb: bool,
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_applications<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Vec<hypr_detect::InstalledApp> {
    app.list_applications()
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn show_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: hypr_notification::Notification,
) -> Result<(), String> {
    app.show_notification(v).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn start_detect_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    params: DetectNotificationParams,
) -> Result<(), String> {
    app.start_detect_notification(params)
        .map_err(|e| e.to_string())
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
    params: EventNotificationParams,
) -> Result<(), String> {
    app.start_event_notification(params)
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
