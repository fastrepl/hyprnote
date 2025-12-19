use crate::types::EventFilter;
use crate::types::{AppleCalendar, AppleEvent};

pub struct AppleCalendarExt<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

#[cfg(target_os = "macos")]
impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleCalendarExt<'a, R, M> {
    #[tracing::instrument(skip_all)]
    pub fn open_calendar(&self) -> Result<(), String> {
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
    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        let handle = crate::apple::Handle::default();
        handle.list_calendars().map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        let handle = crate::apple::Handle::default();
        handle.list_events(filter).map_err(|e| e.to_string())
    }
}

#[cfg(not(target_os = "macos"))]
impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleCalendarExt<'a, R, M> {
    pub fn open_calendar(&self) -> Result<(), String> {
        Err("not supported on this platform".to_string())
    }

    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, String> {
        Err("not supported on this platform".to_string())
    }

    pub fn list_events(&self, _filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
        Err("not supported on this platform".to_string())
    }
}

pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn apple_calendar(&self) -> AppleCalendarExt<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AppleCalendarPluginExt<R> for T {
    fn apple_calendar(&self) -> AppleCalendarExt<'_, R, Self>
    where
        Self: Sized,
    {
        AppleCalendarExt {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
