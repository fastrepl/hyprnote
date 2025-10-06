use std::ffi::CStr;
use std::os::raw::c_char;
use std::sync::Mutex;

use swift_rs::{swift, Bool, SRString};

pub use hypr_notification_interface::*;

swift!(fn _show_notification(
    title: &SRString,
    message: &SRString,
    url: &SRString,
    timeout_seconds: f64
) -> Bool);

swift!(fn _dismiss_all_notifications() -> Bool);

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

#[no_mangle]
pub extern "C" fn rust_on_notification_confirm(id_ptr: *const c_char) {
    if let Some(cb) = CONFIRM_CB.lock().unwrap().as_ref() {
        let id = unsafe { CStr::from_ptr(id_ptr) }
            .to_str()
            .unwrap()
            .to_string();
        cb(id);
    }
}

#[no_mangle]
pub extern "C" fn rust_on_notification_dismiss(id_ptr: *const c_char) {
    if let Some(cb) = DISMISS_CB.lock().unwrap().as_ref() {
        let id = unsafe { CStr::from_ptr(id_ptr) }
            .to_str()
            .unwrap()
            .to_string();
        cb(id);
    }
}

pub fn show(notification: &hypr_notification_interface::Notification) {
    unsafe {
        let title = SRString::from(notification.title.as_str());
        let message = SRString::from(notification.message.as_str());
        let url = notification
            .url
            .as_ref()
            .map(|u| SRString::from(u.as_str()))
            .unwrap_or_else(|| SRString::from(""));
        let timeout_seconds = notification.timeout.map(|d| d.as_secs_f64()).unwrap_or(5.0);

        _show_notification(&title, &message, &url, timeout_seconds);
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
            .url("https://example.com")
            .timeout(std::time::Duration::from_secs(3))
            .build();

        show(&notification);
    }
}
