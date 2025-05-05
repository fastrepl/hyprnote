use crate::AppleCalendarPluginExt;

#[tauri::command]
#[specta::specta]
pub fn open_calendar_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_calendar_access_settings()
}

#[tauri::command]
#[specta::specta]
pub fn open_contacts_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_contacts_access_settings()
}

#[tauri::command]
#[specta::specta]
pub fn calendar_access_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.calendar_access_status()
}

#[tauri::command]
#[specta::specta]
pub fn contacts_access_status<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.contacts_access_status()
}

#[tauri::command]
#[specta::specta]
pub fn request_calendar_access<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    app.request_calendar_access();
}

#[tauri::command]
#[specta::specta]
pub fn request_contacts_access<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    app.request_contacts_access();
}

#[tauri::command]
#[specta::specta]
pub async fn sync_calendars<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_events<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.sync_events().await.map_err(|e| e.to_string())
}
