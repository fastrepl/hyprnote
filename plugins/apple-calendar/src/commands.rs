use crate::types::{Calendar, Event, EventFilter};
use crate::AppleCalendarPluginExt;

#[tauri::command]
#[specta::specta]
pub fn open_calendar<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.open_calendar()
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
