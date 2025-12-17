use std::collections::HashMap;
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

#[cfg(target_os = "linux")]
pub fn show(notification: &hypr_notification_interface::Notification) {
    let Some(key) = &notification.key else {
        hypr_notification_linux::show(notification);
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

    hypr_notification_linux::show(notification);
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
pub fn show(notification: &hypr_notification_interface::Notification) {}

pub fn clear() {
    #[cfg(target_os = "macos")]
    hypr_notification_macos::dismiss_all();

    #[cfg(target_os = "linux")]
    hypr_notification_linux::dismiss_all();
}

pub fn setup_notification_dismiss_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    #[cfg(target_os = "macos")]
    hypr_notification_macos::setup_notification_dismiss_handler(f);

    #[cfg(target_os = "linux")]
    hypr_notification_linux::setup_notification_dismiss_handler(f);
}

pub fn setup_notification_confirm_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    #[cfg(target_os = "macos")]
    hypr_notification_macos::setup_notification_confirm_handler(f);

    #[cfg(target_os = "linux")]
    hypr_notification_linux::setup_notification_confirm_handler(f);
}
