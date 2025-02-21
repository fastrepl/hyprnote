pub trait AppleCalendarPluginExt<R: tauri::Runtime> {
    fn start_worker(&self, user_id: impl Into<String>) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AppleCalendarPluginExt<R> for T {
    fn start_worker(&self, user_id: impl Into<String>) -> Result<(), String> {
        let db = self.state::<hypr_db::user::UserDatabase>().inner().clone();
        let user_id = user_id.into();

        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
            let _ = crate::worker::monitor(crate::worker::WorkerState { db, user_id }).await;
        }));

        Ok(())
    }
}
