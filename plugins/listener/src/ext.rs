use std::future::Future;

use ractor::{call_t, concurrency, registry, Actor, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{BatchActor, BatchArgs, SessionActor, SessionArgs, SessionMsg, SessionParams},
    SessionEvent,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum BatchProvider {
    Deepgram,
    Am,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct BatchParams {
    pub provider: BatchProvider,
    pub file_path: String,
    #[serde(default)]
    pub model: Option<String>,
    pub base_url: String,
    pub api_key: String,
    #[serde(default)]
    pub languages: Vec<hypr_language::Language>,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub channels: Option<u8>,
}

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
    fn run_batch(&self, params: BatchParams) -> impl Future<Output = Result<(), crate::Error>>;
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
            {
                let state = self.state::<crate::SharedState>();
                let guard = state.lock().await;
                SessionEvent::Finalizing {}.emit(&guard.app).unwrap();
            }

            let actor: ActorRef<SessionMsg> = cell.into();
            let _ = actor
                .stop_and_wait(None, Some(concurrency::Duration::from_secs(10)))
                .await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn run_batch(&self, params: BatchParams) -> Result<(), crate::Error> {
        let channels = params.channels.unwrap_or(1);

        let listen_params = owhisper_interface::ListenParams {
            model: params.model.clone(),
            channels,
            languages: params.languages.clone(),
            keywords: params.keywords.clone(),
            redemption_time_ms: None,
        };

        match params.provider {
            BatchProvider::Am => {
                let state = self.state::<crate::SharedState>();
                let guard = state.lock().await;

                let _ = Actor::spawn(
                    Some(BatchActor::name()),
                    BatchActor,
                    BatchArgs {
                        app: guard.app.clone(),
                        file_path: params.file_path,
                        base_url: params.base_url,
                        api_key: params.api_key,
                        listen_params,
                    },
                )
                .await;

                Ok(())
            }
            BatchProvider::Deepgram => {
                let client = owhisper_client::BatchClient::builder()
                    .api_base(params.base_url.clone())
                    .api_key(params.api_key.clone())
                    .params(listen_params)
                    .build_batch();

                let response = client.transcribe_file(&params.file_path).await?;

                SessionEvent::BatchResponse {
                    response: response as _,
                }
                .emit(self.app_handle())
                .map_err(|_| crate::Error::StartSessionFailed)?;

                Ok(())
            }
        }
    }
}
