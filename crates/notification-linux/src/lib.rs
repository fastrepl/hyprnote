mod ui;

use std::cell::RefCell;
use std::sync::Mutex;

pub use hypr_notification_interface::*;

thread_local! {
    static NOTIFICATION_MANAGER: RefCell<ui::NotificationManager> =
        RefCell::new(ui::NotificationManager::new());
}

static CONFIRM_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static DISMISS_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);

pub fn setup_notification_dismiss_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *DISMISS_CB.lock().unwrap() = Some(Box::new(f));
}

pub fn setup_notification_confirm_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *CONFIRM_CB.lock().unwrap() = Some(Box::new(f));
}

fn call_confirm_handler(id: String) {
    if let Some(cb) = CONFIRM_CB.lock().unwrap().as_ref() {
        cb(id);
    }
}

fn call_dismiss_handler(id: String) {
    if let Some(cb) = DISMISS_CB.lock().unwrap().as_ref() {
        cb(id);
    }
}

pub fn show(notification: &hypr_notification_interface::Notification) {
    let title = notification.title.clone();
    let message = notification.message.clone();
    let url = notification.url.clone();
    let timeout_seconds = notification.timeout.map(|d| d.as_secs_f64()).unwrap_or(5.0);

    glib::MainContext::default().invoke(move || {
        NOTIFICATION_MANAGER.with(|manager| {
            manager.borrow_mut().show(
                title,
                message,
                url,
                timeout_seconds,
                call_confirm_handler,
                call_dismiss_handler,
            );
        });
    });
}

pub fn dismiss_all() {
    glib::MainContext::default().invoke(|| {
        NOTIFICATION_MANAGER.with(|manager| {
            manager.borrow_mut().dismiss_all();
        });
    });
}

pub(crate) fn remove_notification(id: &str) {
    let id = id.to_string();
    glib::MainContext::default().invoke(move || {
        NOTIFICATION_MANAGER.with(|manager| {
            manager.borrow_mut().remove_notification(&id);
        });
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification() {
        let notification = hypr_notification_interface::Notification::builder()
            .title("Test Title")
            .message("Test message content")
            .url("https://example.com")
            .timeout(std::time::Duration::from_secs(3))
            .build();

        show(&notification);
    }
}
