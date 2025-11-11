pub use wezterm::ToastNotification as Notification;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;

pub fn show(notif: Notification) {
    if cfg!(debug_assertions) {
        return;
    }

    wezterm::show(notif);
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum NotificationPermission {
    Granted,
    NotGrantedAndShouldRequest,
    NotGrantedAndShouldAskManual,
}

pub fn request_notification_permission() {
    #[cfg(target_os = "macos")]
    macos::request_notification_permission();

    #[cfg(target_os = "linux")]
    linux::request_notification_permission();
}

pub fn open_notification_settings() -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    {
        return macos::open_notification_settings();
    }

    #[cfg(target_os = "linux")]
    {
        return linux::open_notification_settings();
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        return Ok(());
    }
}

pub fn check_notification_permission(
    completion: impl Fn(Result<NotificationPermission, String>) + Send + 'static,
) {
    #[cfg(target_os = "macos")]
    macos::check_notification_permission(completion);

    #[cfg(target_os = "linux")]
    linux::check_notification_permission(completion);

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        // For other platforms (Windows, etc.), assume granted
        completion(Ok(NotificationPermission::Granted));
    }
}
