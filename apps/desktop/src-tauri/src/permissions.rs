// https://github.com/CapSoftware/Cap/blob/5a9f72a076041a7095409fe7a2b0f303239698b1/apps/desktop/src-tauri/src/permissions.rs

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum OSPermission {
    Calendar,
    Contacts,
    AudioRecording,
    ScreenRecording,
    Microphone,
    Accessibility,
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub async fn check_permission_status(permission: OSPermission) -> Option<bool> {
    #[cfg(target_os = "macos")]
    {
        match permission {
            OSPermission::Calendar => {
                Some(hypr_calendar::apple::Handle::new().calendar_access_status())
            }
            OSPermission::Contacts => {
                Some(hypr_calendar::apple::Handle::new().contacts_access_status())
            }
            OSPermission::AudioRecording => None,
            OSPermission::ScreenRecording => None,
            OSPermission::Microphone => None,
            OSPermission::Accessibility => None,
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub async fn open_permission_settings(permission: OSPermission) {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        match permission {
            OSPermission::Calendar => {
                Command::new("open")
                    .arg(
                        "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars",
                    )
                    .spawn()
                    .expect("Failed to open Calendar settings")
                    .wait()
                    .expect("Failed to wait for Calendar settings to open");
            }
            OSPermission::Contacts => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")
                    .spawn()
                    .expect("Failed to open Contacts settings")
                    .wait()
                    .expect("Failed to wait for Contacts settings to open");
            }
            OSPermission::AudioRecording => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture")
                    .spawn()
                    .expect("Failed to open Audio Recording settings")
                    .wait()
                    .expect("Failed to wait for Audio Recording settings to open");
            }
            OSPermission::ScreenRecording => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
                    .spawn()
                    .expect("Failed to open Screen Recording settings")
                    .wait()
                    .expect("Failed to wait for Screen Recording settings to open");
            }
            OSPermission::Microphone => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
                    .spawn()
                    .expect("Failed to open Microphone settings")
                    .wait()
                    .expect("Failed to wait for Microphone settings to open");
            }
            OSPermission::Accessibility => {
                Command::new("open")
                    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                    .spawn()
                    .expect("Failed to open Accessibility settings")
                    .wait()
                    .expect("Failed to wait for Accessibility settings to open");
            }
        }
    }
}
