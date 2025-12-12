use crate::PermissionsPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_microphone_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::PermissionStatus, String> {
    app.check_microphone_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn request_microphone_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_microphone_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_system_audio_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::PermissionStatus, String> {
    app.check_system_audio_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn request_system_audio_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_system_audio_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_accessibility_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::PermissionStatus, String> {
    app.check_accessibility_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn request_accessibility_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_accessibility_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_calendar_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::PermissionStatus, String> {
    app.check_calendar_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn request_calendar_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_calendar_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_contacts_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::PermissionStatus, String> {
    app.check_contacts_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn request_contacts_permission<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_contacts_permission()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn open_calendar_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_calendar_settings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn open_contacts_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_contacts_settings()
        .await
        .map_err(|e| e.to_string())
}
