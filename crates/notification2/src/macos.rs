use std::ptr::NonNull;
use std::sync::LazyLock;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2_user_notifications::{
    UNAuthorizationStatus, UNNotificationSettings, UNUserNotificationCenter,
};

use crate::NotificationPermission;

const CENTER: LazyLock<Retained<UNUserNotificationCenter>> =
    LazyLock::new(|| unsafe { UNUserNotificationCenter::currentNotificationCenter() });

pub fn request_notification_permission() {
    wezterm::macos_initialize();
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
