use crate::types::{Calendar, Event, EventFilter};
use crate::AppleCalendarPluginExt;

#[tauri::command]
#[specta::specta]
pub fn open_calendar<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.open_calendar()
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

#[tauri::command]
#[specta::specta]
pub fn list_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<Calendar>, String> {
    app.list_calendars()
}

#[tauri::command]
#[specta::specta]
pub fn list_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<Event>, String> {
    app.list_events(filter)
}
