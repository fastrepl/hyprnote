use crate::AppleCalendarPluginExt;
#[cfg(target_os = "macos")]
use hypr_calendar_apple::{Calendar, Event, EventFilter};

// Stub types for non-macOS platforms to maintain consistent API signatures
#[cfg(not(target_os = "macos"))]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Calendar;

#[cfg(not(target_os = "macos"))]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Event;

#[cfg(not(target_os = "macos"))]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct EventFilter {
    pub calendar_tracking_id: String,
    pub from: String,
    pub to: String,
}

#[tauri::command]
#[specta::specta]
pub fn open_calendar<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.open_calendar()
}

#[cfg(target_os = "macos")]
#[tauri::command]
#[specta::specta]
pub async fn sync_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<Calendar>, String> {
    app.sync_calendars().await
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
#[specta::specta]
pub async fn sync_calendars<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<Calendar>, String> {
    Err("Apple Calendar is only available on macOS".to_string())
}

#[cfg(target_os = "macos")]
#[tauri::command]
#[specta::specta]
pub async fn sync_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<Event>, String> {
    app.sync_events(filter).await
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
#[specta::specta]
pub async fn sync_events<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    _filter: EventFilter,
) -> Result<Vec<Event>, String> {
    Err("Apple Calendar is only available on macOS".to_string())
}

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
