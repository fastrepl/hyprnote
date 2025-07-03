use std::future::Future;

use futures_util::StreamExt;
use hypr_audio::cpal::traits::{DeviceTrait, HostTrait};

#[cfg(target_os = "macos")]
use {
    objc2::{class, msg_send, runtime::Bool},
    objc2_foundation::NSString,
};

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn list_microphone_devices(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
    fn get_selected_microphone_device(
        &self,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;
    fn set_selected_microphone_device(
        &self,
        device_name: Option<String>,
    ) -> impl Future<Output = Result<(), crate::Error>>;
    fn change_microphone_device(&self, device_name: Option<String>) -> impl Future<Output = ()>;

    fn check_microphone_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn check_system_audio_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn request_microphone_access(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn request_system_audio_access(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_microphone_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_system_audio_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;

    fn get_mic_muted(&self) -> impl Future<Output = bool>;
    fn get_speaker_muted(&self) -> impl Future<Output = bool>;
    fn set_mic_muted(&self, muted: bool) -> impl Future<Output = ()>;
    fn set_speaker_muted(&self, muted: bool) -> impl Future<Output = ()>;

    fn get_state(&self) -> impl Future<Output = crate::fsm::State>;
    fn stop_session(&self) -> impl Future<Output = ()>;
    fn start_session(&self, id: impl Into<String>) -> impl Future<Output = ()>;
    fn pause_session(&self) -> impl Future<Output = ()>;
    fn resume_session(&self) -> impl Future<Output = ()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn list_microphone_devices(&self) -> Result<Vec<String>, crate::Error> {
        tracing::info!("Starting microphone device enumeration");

        let host = hypr_audio::cpal::default_host();
        tracing::debug!("Got audio host: {:?}", std::any::type_name_of_val(&host));

        // Try to get input devices, but handle errors gracefully
        match host.input_devices() {
            Ok(devices) => {
                let mut device_names = Vec::new();
                let mut device_count = 0;

                for device in devices {
                    device_count += 1;
                    match device.name() {
                        Ok(name) => {
                            tracing::info!("Found input device: '{}'", name);
                            device_names.push(name);
                        }
                        Err(e) => {
                            tracing::warn!("Device {} has no accessible name: {}", device_count, e);
                        }
                    }
                }

                tracing::info!(
                    "Successfully enumerated {} microphone devices out of {} total devices",
                    device_names.len(),
                    device_count
                );

                // Also log the default device for comparison
                if let Some(default_device) = host.default_input_device() {
                    if let Ok(default_name) = default_device.name() {
                        tracing::info!("Default input device: '{}'", default_name);
                    }
                }

                Ok(device_names)
            }
            Err(e) => {
                // Log the error but don't fail completely
                tracing::error!(
                    "Failed to enumerate input devices: {} ({})",
                    e,
                    std::any::type_name_of_val(&e)
                );

                // Try to get at least the default device
                match host.default_input_device() {
                    Some(default_device) => {
                        if let Ok(name) = default_device.name() {
                            tracing::info!("Fallback: Using default input device: '{}'", name);
                            Ok(vec![name])
                        } else {
                            tracing::warn!(
                                "Default input device exists but has no accessible name"
                            );
                            Ok(vec![])
                        }
                    }
                    None => {
                        tracing::error!(
                            "No default input device available - no microphones detected"
                        );
                        Ok(vec![])
                    }
                }
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_selected_microphone_device(&self) -> Result<Option<String>, crate::Error> {
        use tauri_plugin_db::DatabasePluginExt;

        let user_id = self.db_user_id().await?.ok_or(crate::Error::NoneUser)?;
        let config = self.db_get_config(&user_id).await?;

        match config {
            Some(config) => Ok(config.general.selected_microphone_device),
            None => Ok(None),
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_selected_microphone_device(
        &self,
        device_name: Option<String>,
    ) -> Result<(), crate::Error> {
        use tauri_plugin_db::DatabasePluginExt;

        // Check if a session is currently running
        let current_state = self.get_state().await;
        match current_state {
            crate::fsm::State::RunningActive { .. } | crate::fsm::State::RunningPaused { .. } => {
                // For active sessions, use the seamless device switching
                tracing::info!("Switching microphone device during active session");
                self.change_microphone_device(device_name).await;
                Ok(())
            }
            _ => {
                // For inactive sessions, just update the config
                let user_id = self.db_user_id().await?.ok_or(crate::Error::NoneUser)?;
                let config = match self.db_get_config(&user_id).await? {
                    Some(mut config) => {
                        config.general.selected_microphone_device = device_name;
                        config
                    }
                    None => {
                        // Create default config with the selected device
                        hypr_db_user::Config {
                            id: uuid::Uuid::new_v4().to_string(),
                            user_id: user_id.clone(),
                            general: hypr_db_user::ConfigGeneral {
                                selected_microphone_device: device_name,
                                ..Default::default()
                            },
                            notification: hypr_db_user::ConfigNotification::default(),
                            ai: hypr_db_user::ConfigAI::default(),
                        }
                    }
                };

                // Use the database plugin abstraction
                self.db_set_config(config)
                    .await
                    .map_err(|e| crate::Error::DatabaseError(e))?;

                tracing::info!("Updated microphone device config for inactive session");
                Ok(())
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn check_microphone_access(&self) -> Result<bool, crate::Error> {
        #[cfg(target_os = "macos")]
        // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L157
        {
            unsafe {
                let av_media_type = NSString::from_str("soun");
                let status: i32 = msg_send![
                    class!(AVCaptureDevice),
                    authorizationStatusForMediaType: &*av_media_type
                ];

                Ok(status == 3)
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Use default device for permission check
            let mut mic_sample_stream = hypr_audio::AudioInput::from_mic().stream();
            let sample = mic_sample_stream.next().await;
            Ok(sample.is_some())
        }
    }

    #[tracing::instrument(skip_all)]
    async fn check_system_audio_access(&self) -> Result<bool, crate::Error> {
        Ok(true)
    }

    #[tracing::instrument(skip_all)]
    async fn request_microphone_access(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L184
        {
            unsafe {
                let av_media_type = NSString::from_str("soun");
                type CompletionBlock = Option<extern "C" fn(Bool)>;
                let completion_block: CompletionBlock = None;
                let _: () = msg_send![
                    class!(AVCaptureDevice),
                    requestAccessForMediaType: &*av_media_type,
                    completionHandler: completion_block
                ];
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Use default device for permission request
            let mut mic_sample_stream = hypr_audio::AudioInput::from_mic().stream();
            mic_sample_stream.next().await;
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn request_system_audio_access(&self) -> Result<(), crate::Error> {
        let stop = hypr_audio::AudioOutput::silence();

        let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker(None).stream();
        speaker_sample_stream.next().await;

        let _ = stop.send(());
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn open_microphone_access_settings(&self) -> Result<(), crate::Error> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
            .spawn()?
            .wait()?;
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn open_system_audio_access_settings(&self) -> Result<(), crate::Error> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture")
            .spawn()?
            .wait()?;
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_state(&self) -> crate::fsm::State {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;
        guard.fsm.state().clone()
    }

    #[tracing::instrument(skip_all)]
    async fn get_mic_muted(&self) -> bool {
        let state = self.state::<crate::SharedState>();

        {
            let guard = state.lock().await;
            guard.fsm.is_mic_muted()
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_speaker_muted(&self) -> bool {
        let state = self.state::<crate::SharedState>();

        {
            let guard = state.lock().await;
            guard.fsm.is_speaker_muted()
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_mic_muted(&self, muted: bool) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::MicMuted(muted);
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_speaker_muted(&self, muted: bool) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::SpeakerMuted(muted);
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, session_id: impl Into<String>) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Start(session_id.into());
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Stop;
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn pause_session(&self) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Pause;
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn resume_session(&self) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Resume;
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn change_microphone_device(&self, device_name: Option<String>) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::MicrophoneDeviceChanged(device_name);
            guard.fsm.handle(&event).await;
        }
    }
}
