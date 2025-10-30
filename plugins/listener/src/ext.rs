use std::future::Future;

use ractor::{call_t, concurrency, registry, Actor, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{SessionActor, SessionArgs, SessionMsg, SessionParams},
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
    fn start_session(&self, params: SessionParams) -> impl Future<Output = ()>;
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

            match call_t!(actor, SessionMsg::GetMicDeviceName, 500) {
                Ok(device_name) => Ok(device_name),
                Err(_) => Ok(None),
            }
        } else {
            Err(crate::Error::ActorNotFound(SessionActor::name()))
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
    async fn set_mic_muted(&self, muted: bool) {
        if let Some(cell) = registry::where_is(SessionActor::name()) {
            let actor: ActorRef<SessionMsg> = cell.into();
            let _ = actor.cast(SessionMsg::SetMicMute(muted));
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, params: SessionParams) {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;

        let _ = Actor::spawn(
            Some(SessionActor::name()),
            SessionActor,
            SessionArgs {
                app: guard.app.clone(),
                params,
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
