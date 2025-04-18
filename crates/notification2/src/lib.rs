pub use wezterm::{show, ToastNotification as Notification};

#[cfg(target_os = "macos")]
mod macos;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum NotificationPermission {
    Granted,
    NotGrantedAndShouldRequest,
    NotGrantedAndShouldAskManual,
}

pub fn request_notification_permission() {
    #[cfg(target_os = "macos")]
    macos::request_notification_permission();
}

pub fn check_notification_permission(
    completion: impl Fn(Result<NotificationPermission, String>) + 'static,
) {
    #[cfg(target_os = "macos")]
    macos::check_notification_permission(completion);
}
