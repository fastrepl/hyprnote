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

#[cfg(feature = "fixture")]
#[tauri::command]
#[specta::specta]
pub fn switch_fixture(fixture_id: String) -> Result<(), String> {
    use std::str::FromStr;
    let fixture = crate::fixture::FixtureSet::from_str(&fixture_id)
        .map_err(|_| format!("Unknown fixture: {}", fixture_id))?;
    crate::fixture::set_fixture(fixture);
    Ok(())
}

#[cfg(feature = "fixture")]
#[tauri::command]
#[specta::specta]
pub fn list_fixtures() -> Vec<String> {
    use strum::VariantNames;
    crate::fixture::FixtureSet::VARIANTS
        .iter()
        .map(|s| s.to_string())
        .collect()
}

#[cfg(feature = "fixture")]
#[tauri::command]
#[specta::specta]
pub fn get_current_fixture() -> String {
    crate::fixture::get_fixture().as_ref().to_string()
}
