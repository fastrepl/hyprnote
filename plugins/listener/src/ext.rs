use std::future::Future;
use std::sync::{Arc, Mutex};

use ractor::{call_t, concurrency, registry, Actor, ActorRef};
use tauri_specta::Event;

use crate::actors::spawn_batch_actor;
use crate::{
    actors::{BatchArgs, ControllerActor, ControllerArgs, ControllerMsg, ControllerParams},
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
    pub session_id: String,
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
    fn start_session(&self, params: ControllerParams) -> impl Future<Output = ()>;
    fn run_batch(&self, params: BatchParams) -> impl Future<Output = Result<(), crate::Error>>;
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

    #[tracing::instrument(skip_all)]
    async fn run_batch(&self, params: BatchParams) -> Result<(), crate::Error> {
        let metadata = tokio::task::spawn_blocking({
            let path = params.file_path.clone();
            move || hypr_audio_utils::audio_file_metadata(path)
        })
        .await
        .map_err(|err| {
            crate::Error::BatchStartFailed(format!("failed to join audio metadata task: {err:?}"))
        })?
        .map_err(|err| {
            crate::Error::BatchStartFailed(format!("failed to read audio metadata: {err}"))
        })?;

        let listen_params = owhisper_interface::ListenParams {
            model: params.model.clone(),
            channels: metadata.channels,
            sample_rate: metadata.sample_rate,
            languages: params.languages.clone(),
            keywords: params.keywords.clone(),
            redemption_time_ms: None,
        };

        match params.provider {
            BatchProvider::Am => {
                let (start_tx, start_rx) =
                    tokio::sync::oneshot::channel::<std::result::Result<(), String>>();
                let start_notifier = Arc::new(Mutex::new(Some(start_tx)));

                let state = self.state::<crate::SharedState>();
                let guard = state.lock().await;
                let app = guard.app.clone();
                drop(guard);

                let args = BatchArgs {
                    app,
                    file_path: params.file_path.clone(),
                    base_url: params.base_url.clone(),
                    api_key: params.api_key.clone(),
                    listen_params: listen_params.clone(),
                    start_notifier: start_notifier.clone(),
                    session_id: params.session_id.clone(),
                };

                match spawn_batch_actor(args).await {
                    Ok(_) => {
                        tracing::info!("batch actor spawned successfully");
                        let state = self.state::<crate::SharedState>();
                        let guard = state.lock().await;
                        SessionEvent::BatchStarted {
                            session_id: params.session_id.clone(),
                        }
                        .emit(&guard.app)
                        .unwrap();
                    }
                    Err(e) => {
                        tracing::error!("batch supervisor spawn failed: {:?}", e);
                        if let Ok(mut notifier) = start_notifier.lock() {
                            if let Some(tx) = notifier.take() {
                                let _ = tx
                                    .send(Err(format!("failed to spawn batch supervisor: {e:?}")));
                            }
                        }
                        return Err(e.into());
                    }
                }

                match start_rx.await {
                    Ok(Ok(())) => Ok(()),
                    Ok(Err(error)) => {
                        tracing::error!("batch actor reported start failure: {}", error);
                        Err(crate::Error::BatchStartFailed(error))
                    }
                    Err(_) => {
                        tracing::error!(
                            "batch actor start notifier dropped before reporting result"
                        );
                        Err(crate::Error::BatchStartFailed(
                            "batch stream start cancelled unexpectedly".to_string(),
                        ))
                    }
                }
            }
            BatchProvider::Deepgram => {
                tracing::debug!("using direct batch client for Deepgram provider");

                SessionEvent::BatchStarted {
                    session_id: params.session_id.clone(),
                }
                .emit(self.app_handle())
                .map_err(|_| crate::Error::StartSessionFailed)?;

                let client = owhisper_client::BatchClient::builder()
                    .api_base(params.base_url.clone())
                    .api_key(params.api_key.clone())
                    .params(listen_params)
                    .build_batch();

                tracing::debug!("transcribing file: {}", params.file_path);
                let response = client.transcribe_file(&params.file_path).await?;

                tracing::info!("batch transcription completed, emitting response");

                SessionEvent::BatchResponse {
                    session_id: params.session_id.clone(),
                    response,
                }
                .emit(self.app_handle())
                .map_err(|_| crate::Error::StartSessionFailed)?;

                Ok(())
            }
        }
    }
}
