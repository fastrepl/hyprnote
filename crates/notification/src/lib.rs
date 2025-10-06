use std::collections::HashMap;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

pub use hypr_notification_interface::*;

static RECENT_NOTIFICATIONS: OnceLock<Mutex<HashMap<String, Instant>>> = OnceLock::new();

const DEDUPE_WINDOW: Duration = Duration::from_secs(60 * 5);

pub enum NotificationMutation {
    Confirm,
    Dismiss,
}

#[cfg(target_os = "macos")]
pub fn show(notification: &hypr_notification_interface::Notification) {
    let Some(key) = &notification.key else {
        hypr_notification_macos::show(notification);
        return;
    };

    let recent_map = RECENT_NOTIFICATIONS.get_or_init(|| Mutex::new(HashMap::new()));

    {
        let mut recent_notifications = recent_map.lock().unwrap();
        let now = Instant::now();

        recent_notifications
            .retain(|_, &mut timestamp| now.duration_since(timestamp) < DEDUPE_WINDOW);

        if let Some(&last_shown) = recent_notifications.get(key) {
            let duration = now.duration_since(last_shown);

            if duration < DEDUPE_WINDOW {
                tracing::info!(key = key, duration = ?duration, "skipping_notification");
                return;
            }
        }

        recent_notifications.insert(key.clone(), now);
    }

    hypr_notification_macos::show(notification);
}

#[cfg(not(target_os = "macos"))]
pub fn show(notification: &hypr_notification_interface::Notification) {}

pub fn clear() {
    #[cfg(target_os = "macos")]
    hypr_notification_macos::dismiss_all();
}

pub fn setup_notification_dismiss_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    #[cfg(target_os = "macos")]
    hypr_notification_macos::setup_notification_dismiss_handler(f);
}

pub fn setup_notification_confirm_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    #[cfg(target_os = "macos")]
    hypr_notification_macos::setup_notification_confirm_handler(f);
}

#[cfg(target_os = "macos")]
pub fn is_do_not_disturb() -> bool {
    match Command::new("defaults")
        .args([
            "read",
            "com.apple.controlcenter",
            "NSStatusItem Visible FocusModes",
        ])
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                let out = String::from_utf8_lossy(&output.stdout);
                out.trim() == "1"
            } else {
                false
            }
        }
        Err(_) => false,
    }
}

#[cfg(not(target_os = "macos"))]
pub fn is_do_not_disturb() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_do_not_disturb() {
        println!("Do Not Disturb: {}", is_do_not_disturb());
    }
}
