use crate::models::PermissionStatus;

#[cfg(target_os = "macos")]
use block2::StackBlock;
#[cfg(target_os = "macos")]
use objc2_av_foundation::{AVCaptureDevice, AVMediaTypeAudio};
#[cfg(target_os = "macos")]
use objc2_contacts::{CNContactStore, CNEntityType};
#[cfg(target_os = "macos")]
use objc2_event_kit::{EKEntityType, EKEventStore};

pub struct Permissions<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Permissions<'a, R, M> {
    pub async fn check_microphone_permission(&self) -> Result<PermissionStatus, crate::Error> {
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
            use futures_util::StreamExt;
            let mut mic_sample_stream =
                hypr_audio::AudioInput::from_mic(None)?.stream();
            let sample = mic_sample_stream.next().await;
            Ok(if sample.is_some() {
                PermissionStatus::Authorized
            } else {
                PermissionStatus::Denied
            })
        }
    }

    pub async fn request_microphone_permission(&self) -> Result<(), crate::Error> {
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
            use futures_util::StreamExt;
            let mut mic_sample_stream =
                hypr_audio::AudioInput::from_mic(None)?.stream();
            mic_sample_stream.next().await;
        }

        Ok(())
    }

    pub async fn check_system_audio_permission(&self) -> Result<PermissionStatus, crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let status = hypr_tcc::audio_capture_permission_status();
            Ok(status.into())
        }

        #[cfg(not(target_os = "macos"))]
        {
            use futures_util::StreamExt;
            let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
            let sample = speaker_sample_stream.next().await;
            Ok(if sample.is_some() {
                PermissionStatus::Authorized
            } else {
                PermissionStatus::Denied
            })
        }
    }

    pub async fn request_system_audio_permission(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.manager.config().identifier.clone();
            self.manager.shell()
                .command("tccutil")
                .args(["reset", "AudioCapture", &bundle_id])
                .spawn()
                .ok();
        }

        let stop = hypr_audio::AudioOutput::silence();

        use futures_util::StreamExt;
        let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
        speaker_sample_stream.next().await;

        let _ = stop.send(());
        Ok(())
    }

    pub async fn check_accessibility_permission(&self) -> Result<PermissionStatus, crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let is_trusted =
                macos_accessibility_client::accessibility::application_is_trusted();
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

    pub async fn request_accessibility_permission(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        }

        Ok(())
    }

    pub async fn check_calendar_permission(&self) -> Result<PermissionStatus, crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let status =
                unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
            Ok(status.into())
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(PermissionStatus::Denied)
        }
    }

    pub async fn request_calendar_permission(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            use objc2_foundation::NSError;
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.manager.config().identifier.clone();
            self.manager.shell()
                .command("tccutil")
                .args(["reset", "Calendar", &bundle_id])
                .spawn()
                .ok();

            let event_store = unsafe { EKEventStore::new() };
            let (tx, rx) = std::sync::mpsc::channel::<bool>();
            let completion =
                block2::RcBlock::new(move |granted: objc2::runtime::Bool, _error: *mut NSError| {
                    let _ = tx.send(granted.as_bool());
                });

            unsafe {
                event_store
                    .requestFullAccessToEventsWithCompletion(&*completion as *const _ as *mut _)
            };

            let _ = rx.recv_timeout(std::time::Duration::from_secs(60));
        }

        Ok(())
    }

    pub async fn check_contacts_permission(&self) -> Result<PermissionStatus, crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let status = unsafe {
                CNContactStore::authorizationStatusForEntityType(CNEntityType::Contacts)
            };
            Ok(status.into())
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(PermissionStatus::Denied)
        }
    }

    pub async fn request_contacts_permission(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            use objc2_foundation::NSError;
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.manager.config().identifier.clone();
            self.manager.shell()
                .command("tccutil")
                .args(["reset", "AddressBook", &bundle_id])
                .spawn()
                .ok();

            let contacts_store = unsafe { CNContactStore::new() };
            let (tx, rx) = std::sync::mpsc::channel::<bool>();
            let completion =
                block2::RcBlock::new(move |granted: objc2::runtime::Bool, _error: *mut NSError| {
                    let _ = tx.send(granted.as_bool());
                });

            unsafe {
                contacts_store.requestAccessForEntityType_completionHandler(
                    CNEntityType::Contacts,
                    &completion,
                );
            };

            let _ = rx.recv_timeout(std::time::Duration::from_secs(60));
        }

        Ok(())
    }

    pub async fn open_calendar_settings(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")
                .spawn()?
                .wait()?;
        }

        Ok(())
    }

    pub async fn open_contacts_settings(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")
                .spawn()?
                .wait()?;
        }

        Ok(())
    }
}

pub trait PermissionsPluginExt<R: tauri::Runtime> {
    fn permissions(&self) -> Permissions<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> PermissionsPluginExt<R> for T {
    fn permissions(&self) -> Permissions<'_, R, Self>
    where
        Self: Sized,
    {
        Permissions {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}