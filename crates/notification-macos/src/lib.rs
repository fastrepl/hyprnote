use std::ffi::CStr;
use std::os::raw::c_char;
use std::sync::Mutex;

use swift_rs::{Bool, SRString, swift};

pub use hypr_notification_interface::*;

swift!(fn _show_notification(
    key: &SRString,
    title: &SRString,
    message: &SRString,
    timeout_seconds: f64
) -> Bool);

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

pub fn show(notification: &hypr_notification_interface::Notification) {
    unsafe {
        let key = SRString::from(
            notification
                .key
                .as_deref()
                .unwrap_or(notification.title.as_str()),
        );
        let title = SRString::from(notification.title.as_str());
        let message = SRString::from(notification.message.as_str());
        let timeout_seconds = notification.timeout.map(|d| d.as_secs_f64()).unwrap_or(5.0);

        _show_notification(&key, &title, &message, timeout_seconds);
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
