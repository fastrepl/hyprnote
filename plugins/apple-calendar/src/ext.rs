use crate::types::{Calendar, Event, EventFilter};

pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn open_calendar(&self) -> Result<(), String>;

    fn open_calendar_access_settings(&self) -> Result<(), String>;
    fn open_contacts_access_settings(&self) -> Result<(), String>;

    fn calendar_access_status(&self) -> bool;
    fn contacts_access_status(&self) -> bool;

    fn has_calendar_access(&self) -> bool;
    fn has_contacts_access(&self) -> bool;

    fn request_calendar_access(&self);
    fn request_contacts_access(&self);

    fn revoke_calendar_access(&self);
    fn revoke_contacts_access(&self);

    fn list_calendars(&self) -> Result<Vec<Calendar>, String>;
    fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, String>;
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
    fn open_calendar_access_settings(&self) -> Result<(), String> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    fn open_contacts_access_settings(&self) -> Result<(), String> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    fn calendar_access_status(&self) -> bool {
        let handle = crate::apple::Handle::new();
        handle.calendar_access_status()
    }

    #[tracing::instrument(skip_all)]
    fn contacts_access_status(&self) -> bool {
        let handle = crate::apple::Handle::new();
        handle.contacts_access_status()
    }

    #[tracing::instrument(skip_all)]
    fn has_calendar_access(&self) -> bool {
        let handle = crate::apple::Handle::new();
        handle.calendar_access_status()
    }

    #[tracing::instrument(skip_all)]
    fn has_contacts_access(&self) -> bool {
        let handle = crate::apple::Handle::new();
        handle.contacts_access_status()
    }

    #[tracing::instrument(skip_all)]
    fn request_calendar_access(&self) {
        use tauri_plugin_shell::ShellExt;

        let bundle_id = self.config().identifier.clone();
        self.app_handle()
            .shell()
            .command("tccutil")
            .args(["reset", "Calendar", &bundle_id])
            .spawn()
            .ok();

        let mut handle = crate::apple::Handle::new();
        handle.request_calendar_access();
    }

    #[tracing::instrument(skip_all)]
    fn request_contacts_access(&self) {
        use tauri_plugin_shell::ShellExt;

        let bundle_id = self.config().identifier.clone();
        self.app_handle()
            .shell()
            .command("tccutil")
            .args(["reset", "AddressBook", &bundle_id])
            .spawn()
            .ok();

        let mut handle = crate::apple::Handle::new();
        handle.request_contacts_access();
    }

    #[tracing::instrument(skip_all)]
    fn revoke_calendar_access(&self) {
        use tauri_plugin_shell::ShellExt;

        let bundle_id = self.config().identifier.clone();
        self.app_handle()
            .shell()
            .command("tccutil")
            .args(["reset", "Calendar", &bundle_id])
            .spawn()
            .ok();
    }

    #[tracing::instrument(skip_all)]
    fn revoke_contacts_access(&self) {
        use tauri_plugin_shell::ShellExt;

        let bundle_id = self.config().identifier.clone();
        self.app_handle()
            .shell()
            .command("tccutil")
            .args(["reset", "AddressBook", &bundle_id])
            .spawn()
            .ok();
    }

    #[tracing::instrument(skip_all)]
    fn list_calendars(&self) -> Result<Vec<Calendar>, String> {
        let handle = crate::apple::Handle::new();
        handle.list_calendars().map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, String> {
        let handle = crate::apple::Handle::new();
        handle.list_events(filter).map_err(|e| e.to_string())
    }
}

#[cfg(not(target_os = "macos"))]
impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AppleCalendarPluginExt<R> for T {
    fn open_calendar(&self) -> Result<(), String> {
        Err("not supported on this platform".to_string())
    }

    fn open_calendar_access_settings(&self) -> Result<(), String> {
        Err("not supported on this platform".to_string())
    }

    fn open_contacts_access_settings(&self) -> Result<(), String> {
        Err("not supported on this platform".to_string())
    }

    fn calendar_access_status(&self) -> bool {
        false
    }

    fn contacts_access_status(&self) -> bool {
        false
    }

    fn has_calendar_access(&self) -> bool {
        false
    }

    fn has_contacts_access(&self) -> bool {
        false
    }

    fn request_calendar_access(&self) {}

    fn request_contacts_access(&self) {}

    fn revoke_calendar_access(&self) {}

    fn revoke_contacts_access(&self) {}

    fn list_calendars(&self) -> Result<Vec<Calendar>, String> {
        Err("not supported on this platform".to_string())
    }

    fn list_events(&self, _filter: EventFilter) -> Result<Vec<Event>, String> {
        Err("not supported on this platform".to_string())
    }
}
