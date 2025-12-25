pub struct Detect<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Detect<'a, R, M> {
    pub fn list_installed_applications(&self) -> Vec<hypr_detect::InstalledApp> {
        hypr_detect::list_installed_apps()
    }

    pub fn list_mic_using_applications(&self) -> Vec<hypr_detect::InstalledApp> {
        hypr_detect::list_mic_using_apps()
    }

    pub fn list_default_ignored_bundle_ids(&self) -> Vec<String> {
        crate::handler::default_ignored_bundle_ids()
    }

    pub async fn set_ignored_bundle_ids(&self, bundle_ids: Vec<String>) {
        let state = self.manager.state::<crate::SharedState>();
        let mut state_guard = state.lock().await;
        state_guard.ignored_bundle_ids = bundle_ids;
    }

    pub async fn set_respect_do_not_disturb(&self, enabled: bool) {
        let state = self.manager.state::<crate::SharedState>();
        let mut state_guard = state.lock().await;
        state_guard.respect_do_not_disturb = enabled;
    }

    pub async fn set_mic_detection_delay_ms(&self, delay_ms: u64) {
        let state = self.manager.state::<crate::SharedState>();
        let mut state_guard = state.lock().await;
        state_guard.mic_detection_delay_ms = delay_ms;
    }

    pub async fn set_mic_stop_grace_ms(&self, grace_ms: u64) {
        let state = self.manager.state::<crate::SharedState>();
        let mut state_guard = state.lock().await;
        state_guard.mic_stop_grace_ms = grace_ms;
    }
}

pub trait DetectPluginExt<R: tauri::Runtime> {
    fn detect(&self) -> Detect<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DetectPluginExt<R> for T {
    fn detect(&self) -> Detect<'_, R, Self>
    where
        Self: Sized,
    {
        Detect {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
