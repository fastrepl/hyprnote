#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::{list_installed_apps, list_mic_using_apps};

#[cfg(not(target_os = "macos"))]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(not(target_os = "macos"))]
pub fn list_mic_using_apps() -> Vec<String> {
    Vec::new()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct InstalledApp {
    pub id: String,
    pub name: String,
}
