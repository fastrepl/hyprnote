use crate::model::{AppleCalendar, AppleEvent};
use crate::types::EventFilter;

pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn open_calendar(&self) -> Result<(), String>;
    fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String>;
    fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, String>;
}

#[cfg(target_os = "macos")]
impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AppleCalendarPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    fn open_calendar(&self) -> Result<(), String> {
        let script = String::from(
            "
            tell application \"Calendar\"
                activate
                switch view to month view
                view calendar at current date
            end tell
        ",
        );

        std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        let handle = crate::apple::Handle::new();
        handle.list_calendars().map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        let handle = crate::apple::Handle::new();
        handle.list_events(filter).map_err(|e| e.to_string())
    }
}

#[cfg(not(target_os = "macos"))]
impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AppleCalendarPluginExt<R> for T {
    fn open_calendar(&self) -> Result<(), String> {
        Err("not supported on this platform".to_string())
    }

    fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        Err("not supported on this platform".to_string())
    }

    fn list_events(&self, _filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        Err("not supported on this platform".to_string())
    }
}
