use futures_util::StreamExt;

use crate::models::PermissionStatus;

#[cfg(target_os = "macos")]
use block2::StackBlock;
#[cfg(target_os = "macos")]
use objc2_av_foundation::{AVCaptureDevice, AVMediaTypeAudio};
#[cfg(target_os = "macos")]
use objc2_contacts::{CNContactStore, CNEntityType};
#[cfg(target_os = "macos")]
use objc2_event_kit::{EKEntityType, EKEventStore};

#[tauri::command]
#[specta::specta]
pub async fn check_microphone_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let status = unsafe {
            let media_type = AVMediaTypeAudio.unwrap();
            AVCaptureDevice::authorizationStatusForMediaType(media_type)
        };
        Ok(status.into())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut mic_sample_stream = hypr_audio::AudioInput::from_mic(None)
            .map_err(|e| e.to_string())?
            .stream();
        let sample = mic_sample_stream.next().await;
        Ok(if sample.is_some() {
            PermissionStatus::Authorized
        } else {
            PermissionStatus::Denied
        })
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_microphone_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        unsafe {
            let media_type = AVMediaTypeAudio.unwrap();
            let block = StackBlock::new(|_granted| {});
            AVCaptureDevice::requestAccessForMediaType_completionHandler(media_type, &block);
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut mic_sample_stream = hypr_audio::AudioInput::from_mic(None)
            .map_err(|e| e.to_string())?
            .stream();
        mic_sample_stream.next().await;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_system_audio_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let status = hypr_tcc::audio_capture_permission_status();
        Ok(status.into())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
        let sample = speaker_sample_stream.next().await;
        Ok(if sample.is_some() {
            PermissionStatus::Authorized
        } else {
            PermissionStatus::Denied
        })
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_system_audio_permission<R: tauri::Runtime>(
    #[allow(unused_variables)] app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_shell::ShellExt;

        let bundle_id = app.config().identifier.clone();
        app.shell()
            .command("tccutil")
            .args(["reset", "AudioCapture", &bundle_id])
            .spawn()
            .ok();
    }

    let stop = hypr_audio::AudioOutput::silence();

    let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
    speaker_sample_stream.next().await;

    let _ = stop.send(());
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_accessibility_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let is_trusted = macos_accessibility_client::accessibility::application_is_trusted();
        Ok(if is_trusted {
            PermissionStatus::Authorized
        } else {
            PermissionStatus::Denied
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(PermissionStatus::Denied)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_accessibility_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_calendar_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
        Ok(status.into())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(PermissionStatus::Denied)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_calendar_permission<R: tauri::Runtime>(
    #[allow(unused_variables)] app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::NSError;
        use tauri_plugin_shell::ShellExt;

        let bundle_id = app.config().identifier.clone();
        app.shell()
            .command("tccutil")
            .args(["reset", "Calendar", &bundle_id])
            .spawn()
            .ok();

        let event_store = unsafe { EKEventStore::new() };
        let (tx, rx) = std::sync::mpsc::channel::<bool>();
        let completion = block2::RcBlock::new(move |granted: objc2::runtime::Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });

        unsafe {
            event_store.requestFullAccessToEventsWithCompletion(&*completion as *const _ as *mut _)
        };

        let _ = rx.recv_timeout(std::time::Duration::from_secs(60));
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_contacts_permission<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let status =
            unsafe { CNContactStore::authorizationStatusForEntityType(CNEntityType::Contacts) };
        Ok(status.into())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(PermissionStatus::Denied)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn request_contacts_permission<R: tauri::Runtime>(
    #[allow(unused_variables)] app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::NSError;
        use tauri_plugin_shell::ShellExt;

        let bundle_id = app.config().identifier.clone();
        app.shell()
            .command("tccutil")
            .args(["reset", "AddressBook", &bundle_id])
            .spawn()
            .ok();

        let contacts_store = unsafe { CNContactStore::new() };
        let (tx, rx) = std::sync::mpsc::channel::<bool>();
        let completion = block2::RcBlock::new(move |granted: objc2::runtime::Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });

        unsafe {
            contacts_store.requestAccessForEntityType_completionHandler(CNEntityType::Contacts, &completion);
        };

        let _ = rx.recv_timeout(std::time::Duration::from_secs(60));
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn open_calendar_settings<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn open_contacts_settings<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
