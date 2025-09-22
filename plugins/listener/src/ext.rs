use std::future::Future;

use futures_util::StreamExt;
use ractor::{call_t, concurrency, registry, Actor, ActorRef};

use tauri_specta::Event;

#[cfg(target_os = "macos")]
use {
    objc2::{class, msg_send, runtime::Bool},
    objc2_foundation::NSString,
};

use crate::{
    actors::{SessionActor, SessionArgs, SessionMsg},
    SessionEvent,
};

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn list_microphone_devices(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
    fn get_current_microphone_device(
        &self,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;
    fn set_microphone_device(
        &self,
        device_name: impl Into<String>,
    ) -> impl Future<Output = Result<(), crate::Error>>;

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
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn list_microphone_devices(&self) -> Result<Vec<String>, crate::Error> {
        Ok(hypr_audio::AudioInput::list_mic_devices())
    }

    #[tracing::instrument(skip_all)]
    async fn get_current_microphone_device(&self) -> Result<Option<String>, crate::Error> {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();

            match call_t!(actor, SessionMsg::GetMicDeviceName, 100) {
                Ok(device_name) => Ok(device_name),
                Err(_) => Ok(None),
            }
        } else {
            Ok(None)
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_microphone_device(
        &self,
        device_name: impl Into<String>,
    ) -> Result<(), crate::Error> {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();
            let _ = actor.cast(SessionMsg::ChangeMicDevice(Some(device_name.into())));
        }

        Ok(())
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
            let mut mic_sample_stream = hypr_audio::AudioInput::from_mic(None).unwrap().stream();
            let sample = mic_sample_stream.next().await;
            Ok(sample.is_some())
        }
    }

    #[tracing::instrument(skip_all)]
    async fn check_system_audio_access(&self) -> Result<bool, crate::Error> {
        Ok(hypr_tcc::audio_capture_permission_granted())
    }

    #[tracing::instrument(skip_all)]
    async fn request_microphone_access(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            /*
            {
                use tauri_plugin_shell::ShellExt;

                let bundle_id = self.config().identifier.clone();
                self.app_handle()
                    .shell()
                    .command("tccutil")
                    .args(["reset", "Microphone", &bundle_id])
                    .spawn()
                    .ok();
            }
            */

            // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L184
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
            let mut mic_sample_stream = hypr_audio::AudioInput::from_mic(None).unwrap().stream();
            mic_sample_stream.next().await;
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn request_system_audio_access(&self) -> Result<(), crate::Error> {
        {
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.config().identifier.clone();
            self.app_handle()
                .shell()
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
        if let Some(_) = registry::where_is(SessionActor::name()) {
            crate::fsm::State::RunningActive
        } else {
            crate::fsm::State::Inactive
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_mic_muted(&self) -> bool {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();

            match call_t!(actor, SessionMsg::GetMicMute, 100) {
                Ok(muted) => muted,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_speaker_muted(&self) -> bool {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();

            match call_t!(actor, SessionMsg::GetSpeakerMute, 100) {
                Ok(muted) => muted,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_mic_muted(&self, muted: bool) {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();
            let _ = actor.cast(SessionMsg::SetMicMute(muted));
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_speaker_muted(&self, muted: bool) {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();
            let _ = actor.cast(SessionMsg::SetSpeakerMute(muted));
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, session_id: impl Into<String>) {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;

        let _ = Actor::spawn(
            Some(SessionActor::name()),
            SessionActor,
            SessionArgs {
                app: guard.app.clone(),
                session_id: session_id.into(),
            },
        )
        .await;
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();

            if let Ok(_) = actor
                .stop_and_wait(None, Some(concurrency::Duration::from_secs(3)))
                .await
            {
                let state = self.state::<crate::SharedState>();
                let guard = state.lock().await;
                SessionEvent::Inactive {}.emit(&guard.app).unwrap();
            }
        }
    }
}
