use crate::AppleCalendarPluginExt;
use crate::types::EventFilter;
use crate::types::{AppleCalendar, AppleEvent};

#[tauri::command]
#[specta::specta]
pub fn open_calendar<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.apple_calendar().open_calendar()
}

#[tauri::command]
#[specta::specta]
pub fn list_calendars<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<AppleCalendar>, String> {
    app.apple_calendar().list_calendars()
}

#[tauri::command]
#[specta::specta]
pub fn list_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<AppleEvent>, String> {
    app.apple_calendar().list_events(filter)
}
