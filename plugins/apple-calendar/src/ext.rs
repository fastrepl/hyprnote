#[cfg(target_os = "macos")]
use hypr_calendar_apple::{Calendar, CalendarSource, Event, EventFilter};
#[cfg(target_os = "macos")]
use std::future::Future;

pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn open_calendar(&self) -> Result<(), String>;

    fn open_calendar_access_settings(&self) -> Result<(), String>;
    fn open_contacts_access_settings(&self) -> Result<(), String>;

    fn calendar_access_status(&self) -> bool;
    fn contacts_access_status(&self) -> bool;

    fn request_calendar_access(&self);
    fn request_contacts_access(&self);

    #[cfg(target_os = "macos")]
    fn sync_calendars(&self) -> impl Future<Output = Result<Vec<Calendar>, String>> + Send;
    #[cfg(target_os = "macos")]
    fn sync_events(
        &self,
        filter: EventFilter,
    ) -> impl Future<Output = Result<Vec<Event>, String>> + Send;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AppleCalendarPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    fn open_calendar(&self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
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
        #[cfg(not(target_os = "macos"))]
        {
            Err("Apple Calendar is only available on macOS".to_string())
        }
    }

    #[tracing::instrument(skip_all)]
    fn open_calendar_access_settings(&self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")
                .spawn()
                .map_err(|e| e.to_string())?
                .wait()
                .map_err(|e| e.to_string())?;

            Ok(())
        }
        #[cfg(not(target_os = "macos"))]
        {
            Err("Apple Calendar is only available on macOS".to_string())
        }
    }

    #[tracing::instrument(skip_all)]
    fn open_contacts_access_settings(&self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")
                .spawn()
                .map_err(|e| e.to_string())?
                .wait()
                .map_err(|e| e.to_string())?;

            Ok(())
        }
        #[cfg(not(target_os = "macos"))]
        {
            Err("Apple Calendar is only available on macOS".to_string())
        }
    }

    #[tracing::instrument(skip_all)]
    fn calendar_access_status(&self) -> bool {
        #[cfg(target_os = "macos")]
        {
            let handle = hypr_calendar_apple::Handle::new();
            handle.calendar_access_status()
        }
        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    fn contacts_access_status(&self) -> bool {
        #[cfg(target_os = "macos")]
        {
            let handle = hypr_calendar_apple::Handle::new();
            handle.contacts_access_status()
        }
        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    fn request_calendar_access(&self) {
        #[cfg(target_os = "macos")]
        {
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.config().identifier.clone();
            self.app_handle()
                .shell()
                .command("tccutil")
                .args(["reset", "Calendar", &bundle_id])
                .spawn()
                .ok();

            let mut handle = hypr_calendar_apple::Handle::new();
            handle.request_calendar_access();
        }
    }

    #[tracing::instrument(skip_all)]
    fn request_contacts_access(&self) {
        #[cfg(target_os = "macos")]
        {
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.config().identifier.clone();
            self.app_handle()
                .shell()
                .command("tccutil")
                .args(["reset", "AddressBook", &bundle_id])
                .spawn()
                .ok();

            let mut handle = hypr_calendar_apple::Handle::new();
            handle.request_contacts_access();
        }
    }

    #[cfg(target_os = "macos")]
    #[tracing::instrument(skip_all)]
    async fn sync_calendars(&self) -> Result<Vec<Calendar>, String> {
        let handle = hypr_calendar_apple::Handle::new();
        handle.list_calendars().await.map_err(|e| e.to_string())
    }

    #[cfg(target_os = "macos")]
    #[tracing::instrument(skip_all)]
    async fn sync_events(&self, filter: EventFilter) -> Result<Vec<Event>, String> {
        let handle = hypr_calendar_apple::Handle::new();
        handle.list_events(filter).await.map_err(|e| e.to_string())
    }
}
