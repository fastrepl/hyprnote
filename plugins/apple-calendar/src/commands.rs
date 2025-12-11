use crate::model::{AppleCalendar, AppleEvent};
use crate::types::EventFilter;
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
) -> Result<Vec<AppleCalendar>, String> {
    app.list_calendars()
}

#[tauri::command]
#[specta::specta]
pub fn list_events<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: EventFilter,
) -> Result<Vec<AppleEvent>, String> {
    app.list_events(filter)
}
