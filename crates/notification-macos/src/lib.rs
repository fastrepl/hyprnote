use std::ffi::CStr;
use std::os::raw::c_char;
use std::sync::Mutex;

use swift_rs::{Bool, SRString, swift};

pub use hypr_notification_interface::*;

swift!(fn _show_notification(json_payload: &SRString) -> Bool);

swift!(fn _dismiss_all_notifications() -> Bool);

static CONFIRM_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static ACCEPT_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static DISMISS_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static TIMEOUT_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);

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

pub fn setup_notification_accept_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *ACCEPT_CB.lock().unwrap() = Some(Box::new(f));
}

pub fn setup_notification_timeout_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *TIMEOUT_CB.lock().unwrap() = Some(Box::new(f));
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rust_on_notification_confirm(key_ptr: *const c_char) {
    if let Some(cb) = CONFIRM_CB.lock().unwrap().as_ref() {
        let key = unsafe { CStr::from_ptr(key_ptr) }
            .to_str()
            .unwrap()
            .to_string();
        cb(key);
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rust_on_notification_accept(key_ptr: *const c_char) {
    if let Some(cb) = ACCEPT_CB.lock().unwrap().as_ref() {
        let key = unsafe { CStr::from_ptr(key_ptr) }
            .to_str()
            .unwrap()
            .to_string();
        cb(key);
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rust_on_notification_dismiss(key_ptr: *const c_char) {
    if let Some(cb) = DISMISS_CB.lock().unwrap().as_ref() {
        let key = unsafe { CStr::from_ptr(key_ptr) }
            .to_str()
            .unwrap()
            .to_string();
        cb(key);
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rust_on_notification_timeout(key_ptr: *const c_char) {
    if let Some(cb) = TIMEOUT_CB.lock().unwrap().as_ref() {
        let key = unsafe { CStr::from_ptr(key_ptr) }
            .to_str()
            .unwrap()
            .to_string();
        cb(key);
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationPayload<'a> {
    key: &'a str,
    title: &'a str,
    message: &'a str,
    timeout_seconds: f64,
    start_time: Option<i64>,
    participants: Option<&'a [Participant]>,
    event_details: Option<&'a EventDetails>,
    action_label: Option<&'a str>,
}

pub fn show(notification: &hypr_notification_interface::Notification) {
    let key = notification
        .key
        .as_deref()
        .unwrap_or(notification.title.as_str());
    let timeout_seconds = notification.timeout.map(|d| d.as_secs_f64()).unwrap_or(5.0);

    let payload = NotificationPayload {
        key,
        title: &notification.title,
        message: &notification.message,
        timeout_seconds,
        start_time: notification.start_time,
        participants: notification.participants.as_deref(),
        event_details: notification.event_details.as_ref(),
        action_label: notification.action_label.as_deref(),
    };

    let json = serde_json::to_string(&payload).unwrap();
    let json_str = SRString::from(json.as_str());

    unsafe {
        _show_notification(&json_str);
    }
}

pub fn dismiss_all() {
    unsafe {
        _dismiss_all_notifications();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification() {
        let notification = hypr_notification_interface::Notification::builder()
            .title("Test Title")
            .message("Test message content")
            .timeout(std::time::Duration::from_secs(3))
            .build();

        show(&notification);
    }
}
