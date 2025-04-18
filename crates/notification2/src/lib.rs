use std::ptr::NonNull;
use std::sync::LazyLock;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2_user_notifications::{
    UNAuthorizationStatus, UNNotificationSettings, UNUserNotificationCenter,
};

pub use wezterm::{show, ToastNotification as Notification};

#[cfg(target_os = "macos")]
pub fn request_notification_permission() {
    wezterm::macos_initialize();
}

#[cfg(not(target_os = "macos"))]
pub fn request_notification_permission() {
    // do nothing
}

const CENTER: LazyLock<Retained<UNUserNotificationCenter>> =
    LazyLock::new(|| unsafe { UNUserNotificationCenter::currentNotificationCenter() });

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum NotificationPermission {
    Granted,
    NotGrantedAndShouldRequest,
    NotGrantedAndShouldAskManual,
}

pub fn check_notification_permission(
    completion: impl Fn(Result<NotificationPermission, String>) + 'static,
) {
    let completion_block = RcBlock::new(move |settings: NonNull<UNNotificationSettings>| {
        let settings = unsafe { settings.as_ref() };
        let auth_status = unsafe { settings.authorizationStatus() };

        let result = match auth_status {
            UNAuthorizationStatus::Authorized => NotificationPermission::Granted,
            UNAuthorizationStatus::NotDetermined => {
                NotificationPermission::NotGrantedAndShouldRequest
            }
            _ => NotificationPermission::NotGrantedAndShouldAskManual,
        };
        completion(Ok(result))
    });

    unsafe {
        CENTER.getNotificationSettingsWithCompletionHandler(&completion_block);
    }
}
