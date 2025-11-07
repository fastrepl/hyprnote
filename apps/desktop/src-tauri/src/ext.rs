use crate::StoreKey;
use tauri_plugin_store2::{ScopedStore, StorePluginExt};
pub trait AppExt<R: tauri::Runtime> {
    fn desktop_store(&self) -> Result<ScopedStore<R, crate::StoreKey>, String>;

    fn get_onboarding_needed(&self) -> Result<bool, String>;
    fn set_onboarding_needed(&self, v: bool) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AppExt<R> for T {
    #[tracing::instrument(skip_all)]
    fn desktop_store(&self) -> Result<ScopedStore<R, crate::StoreKey>, String> {
        self.scoped_store("desktop").map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    fn get_onboarding_needed(&self) -> Result<bool, String> {
        let store = self.desktop_store()?;
        store
            .get(StoreKey::OnboardingNeeded2)
            .map(|opt| opt.unwrap_or(true))
            .map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    fn set_onboarding_needed(&self, v: bool) -> Result<(), String> {
        let store = self.desktop_store()?;
        store
            .set(StoreKey::OnboardingNeeded2, v)
            .map_err(|e| e.to_string())
    }
}
