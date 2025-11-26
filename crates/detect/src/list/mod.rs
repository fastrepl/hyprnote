#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::{get_meeting_app, list_installed_apps, list_mic_using_apps};

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "linux")]
pub use linux::{list_installed_apps, list_mic_using_apps};

#[cfg(target_os = "linux")]
pub fn get_meeting_app() -> Option<InstalledApp> {
    None
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
pub fn list_mic_using_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
pub fn get_meeting_app() -> Option<InstalledApp> {
    None
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct InstalledApp {
    pub id: String,
    pub name: String,
}
