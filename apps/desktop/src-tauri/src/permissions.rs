// https://github.com/CapSoftware/Cap/blob/5a9f72a076041a7095409fe7a2b0f303239698b1/apps/desktop/src-tauri/src/permissions.rs

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum OSPermission {
    ScreenRecording,
    Camera,
    Microphone,
    Accessibility,
}

#[tauri::command(async)]
#[specta::specta]
pub fn open_permission_settings(permission: OSPermission) {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        match permission {
            OSPermission::ScreenRecording => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
                    .spawn()
                    .expect("Failed to open Screen Recording settings");
            }
            OSPermission::Camera => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Camera")
                    .spawn()
                    .expect("Failed to open Camera settings");
            }
            OSPermission::Microphone => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
                    .spawn()
                    .expect("Failed to open Microphone settings");
            }
            OSPermission::Accessibility => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                    .spawn()
                    .expect("Failed to open Accessibility settings");
            }
        }
    }
}

#[derive(Serialize, Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum OSPermissionStatus {
    // This platform does not require this permission
    NotNeeded,
    // The user has neither granted nor denied permission
    Empty,
    // The user has explicitly granted permission
    Granted,
    // The user has denied permission, or has granted it but not yet restarted
    Denied,
}

impl OSPermissionStatus {
    pub fn permitted(&self) -> bool {
        match self {
            Self::NotNeeded | Self::Granted => true,
            _ => false,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct OSPermissionsCheck {
    pub microphone: OSPermissionStatus,
}

#[tauri::command(async)]
#[specta::specta]
pub fn do_permissions_check(initial_check: bool) -> OSPermissionsCheck {
    #[cfg(target_os = "macos")]
    {
        use cap_media::platform::AVMediaType;

        fn check_av_permission(media_type: AVMediaType) -> OSPermissionStatus {
            use cap_media::platform::AVAuthorizationStatus;
            use objc::*;

            let cls = objc::class!(AVCaptureDevice);
            let status: AVAuthorizationStatus =
                unsafe { msg_send![cls, authorizationStatusForMediaType:media_type.into_ns_str()] };
            match status {
                AVAuthorizationStatus::NotDetermined => OSPermissionStatus::Empty,
                AVAuthorizationStatus::Authorized => OSPermissionStatus::Granted,
                _ => OSPermissionStatus::Denied,
            }
        }

        OSPermissionsCheck {
            microphone: check_av_permission(AVMediaType::Audio),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        OSPermissionsCheck {
            microphone: OSPermissionStatus::NotNeeded,
            camera: OSPermissionStatus::NotNeeded,
            accessibility: OSPermissionStatus::NotNeeded,
        }
    }
}
