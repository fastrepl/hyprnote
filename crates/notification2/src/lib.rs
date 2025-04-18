pub use wezterm::{show, ToastNotification as Notification};

#[cfg(target_os = "macos")]
pub fn initialize() {
    wezterm::macos_initialize();
}

#[cfg(not(target_os = "macos"))]
pub fn initialize() {
    // do nothing
}
