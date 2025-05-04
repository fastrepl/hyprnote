#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Notification {
    pub title: String,
    pub message: String,
    pub url: Option<String>,
    pub timeout: Option<std::time::Duration>,
}

impl From<Notification> for wezterm::ToastNotification {
    fn from(notif: Notification) -> Self {
        wezterm::ToastNotification {
            title: notif.title,
            message: notif.message,
            url: notif.url,
            timeout: notif.timeout,
        }
    }
}

#[cfg(target_os = "macos")]
mod macos;

pub fn show(notif: Notification) {
    if cfg!(debug_assertions) {
        return;
    }

    wezterm::show(notif.into());
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
}

pub fn open_notification_settings() -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    {
        return macos::open_notification_settings();
    }

    #[cfg(not(target_os = "macos"))]
    {
        return Ok(());
    }
}

pub fn check_notification_permission(
    completion: impl Fn(Result<NotificationPermission, String>) + 'static,
) {
    #[cfg(target_os = "macos")]
    macos::check_notification_permission(completion);
}
