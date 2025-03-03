pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn open_calendar_access_settings(&self) -> Result<(), String>;
    fn open_contacts_access_settings(&self) -> Result<(), String>;
    fn calendar_access_status(&self) -> bool;
    fn contacts_access_status(&self) -> bool;
    fn request_calendar_access(&self);
    fn request_contacts_access(&self);
    fn start_worker(&self, user_id: impl Into<String>) -> Result<(), String>;
    fn stop_worker(&self);
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AppleCalendarPluginExt<R> for T {
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
        let handle = hypr_calendar::apple::Handle::new();
        handle.calendar_access_status()
    }

    #[tracing::instrument(skip_all)]
    fn contacts_access_status(&self) -> bool {
        let handle = hypr_calendar::apple::Handle::new();
        handle.contacts_access_status()
    }

    #[tracing::instrument(skip_all)]
    fn request_calendar_access(&self) {
        let mut handle = hypr_calendar::apple::Handle::new();
        handle.request_calendar_access();
    }

    #[tracing::instrument(skip_all)]
    fn request_contacts_access(&self) {
        let mut handle = hypr_calendar::apple::Handle::new();
        handle.request_contacts_access();
    }

    #[tracing::instrument(skip_all)]
    fn start_worker(&self, user_id: impl Into<String>) -> Result<(), String> {
        let db = self.state::<hypr_db_user::UserDatabase>().inner().clone();
        let user_id = user_id.into();

        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
            let _ = crate::worker::monitor(crate::worker::WorkerState { db, user_id }).await;
        }));

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    fn stop_worker(&self) {
        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        if let Some(handle) = s.worker_handle.take() {
            handle.abort();
        }
    }
}
