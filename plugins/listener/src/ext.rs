use std::future::Future;

use ractor::{call_t, concurrency, registry, Actor, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{ControllerActor, ControllerArgs, ControllerMsg, ControllerParams},
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

    fn get_mic_muted(&self) -> impl Future<Output = bool>;
    fn set_mic_muted(&self, muted: bool) -> impl Future<Output = ()>;

    fn get_state(&self) -> impl Future<Output = crate::fsm::State>;
    fn stop_session(&self) -> impl Future<Output = ()>;
    fn start_session(&self, params: ControllerParams) -> impl Future<Output = ()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn list_microphone_devices(&self) -> Result<Vec<String>, crate::Error> {
        Ok(hypr_audio::AudioInput::list_mic_devices())
    }

    #[tracing::instrument(skip_all)]
    async fn get_current_microphone_device(&self) -> Result<Option<String>, crate::Error> {
        if let Some(cell) = registry::where_is(ControllerActor::name()) {
            let actor: ActorRef<ControllerMsg> = cell.into();

            match call_t!(actor, ControllerMsg::GetMicDeviceName, 500) {
                Ok(device_name) => Ok(device_name),
                Err(_) => Ok(None),
            }
        } else {
            Err(crate::Error::ActorNotFound(ControllerActor::name()))
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_microphone_device(
        &self,
        device_name: impl Into<String>,
    ) -> Result<(), crate::Error> {
        if let Some(cell) = registry::where_is(ControllerActor::name()) {
            let actor: ActorRef<ControllerMsg> = cell.into();
            let _ = actor.cast(ControllerMsg::ChangeMicDevice(Some(device_name.into())));
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_state(&self) -> crate::fsm::State {
        if registry::where_is(ControllerActor::name()).is_some() {
            crate::fsm::State::RunningActive
        } else {
            crate::fsm::State::Inactive
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_mic_muted(&self) -> bool {
        if let Some(cell) = registry::where_is(ControllerActor::name()) {
            let actor: ActorRef<ControllerMsg> = cell.into();

            match call_t!(actor, ControllerMsg::GetMicMute, 100) {
                Ok(muted) => muted,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_mic_muted(&self, muted: bool) {
        if let Some(cell) = registry::where_is(ControllerActor::name()) {
            let actor: ActorRef<ControllerMsg> = cell.into();
            let _ = actor.cast(ControllerMsg::SetMicMute(muted));
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, params: ControllerParams) {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;

        let _ = Actor::spawn(
            Some(ControllerActor::name()),
            ControllerActor,
            ControllerArgs {
                app: guard.app.clone(),
                params,
            },
        )
        .await;
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) {
        if let Some(cell) = registry::where_is(ControllerActor::name()) {
            let actor: ActorRef<ControllerMsg> = cell.into();

            let session_id = call_t!(actor, ControllerMsg::GetSessionId, 100).ok();

            {
                let state = self.state::<crate::SharedState>();
                let guard = state.lock().await;
                if let Some(session_id) = session_id.clone() {
                    SessionEvent::Finalizing { session_id }
                        .emit(&guard.app)
                        .unwrap();
                }
            }

            let _ = actor
                .stop_and_wait(None, Some(concurrency::Duration::from_secs(10)))
                .await;
        }
    }
}
