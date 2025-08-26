pub use hypr_notification_interface::*;

#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool, SRString};

#[cfg(target_os = "macos")]
swift!(fn _show_notification(
    title: &SRString,
    message: &SRString,
    url: &SRString,
    has_url: Bool,
    timeout_seconds: f64
) -> Bool);

#[cfg(target_os = "macos")]
pub fn show(notification: &hypr_notification_interface::Notification) {
    unsafe {
        let title = SRString::from(notification.title.as_str());
        let message = SRString::from(notification.message.as_str());
        let url = notification
            .url
            .as_ref()
            .map(|u| SRString::from(u.as_str()))
            .unwrap_or_else(|| SRString::from(""));
        let has_url = notification.url.is_some();
        let timeout_seconds = notification.timeout.map(|d| d.as_secs_f64()).unwrap_or(5.0);

        _show_notification(&title, &message, &url, has_url, timeout_seconds);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification() {
        let notification = hypr_notification_interface::Notification {
            title: "Test Title".to_string(),
            message: "Test message content".to_string(),
            url: Some("https://example.com".to_string()),
            timeout: Some(std::time::Duration::from_secs(3)),
        };

        show(&notification);
    }
}
