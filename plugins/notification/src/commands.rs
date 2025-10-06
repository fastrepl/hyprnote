use crate::NotificationPluginExt;

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
pub(crate) async fn get_respect_do_not_disturb<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_respect_do_not_disturb().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_respect_do_not_disturb<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_respect_do_not_disturb(enabled)
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
pub(crate) async fn get_ignored_platforms<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.get_ignored_platforms().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_ignored_platforms<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    platforms: Vec<String>,
) -> Result<(), String> {
    app.set_ignored_platforms(platforms)
        .map_err(|e| e.to_string())
}
