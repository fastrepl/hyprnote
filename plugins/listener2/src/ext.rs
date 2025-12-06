use std::future::Future;
use std::sync::{Arc, Mutex};

use tauri_specta::Event;

use crate::batch::{spawn_batch_actor, BatchArgs};
use crate::BatchEvent;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum BatchProvider {
    Deepgram,
    Soniox,
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

pub trait Listener2PluginExt<R: tauri::Runtime> {
    fn run_batch(&self, params: BatchParams) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Listener2PluginExt<R> for T {
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

        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;
        let app = guard.app.clone();
        drop(guard);

        match params.provider {
            BatchProvider::Am => {
                let (start_tx, start_rx) =
                    tokio::sync::oneshot::channel::<std::result::Result<(), String>>();
                let start_notifier = Arc::new(Mutex::new(Some(start_tx)));

                let args = BatchArgs {
                    app: app.clone(),
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
                        BatchEvent::BatchStarted {
                            session_id: params.session_id.clone(),
                        }
                        .emit(&app)
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

                BatchEvent::BatchStarted {
                    session_id: params.session_id.clone(),
                }
                .emit(&app)
                .map_err(|e| {
                    crate::Error::BatchStartFailed(format!(
                        "failed to emit BatchStarted event: {e}"
                    ))
                })?;

                let client = owhisper_client::ListenClient::builder()
                    .api_base(params.base_url.clone())
                    .api_key(params.api_key.clone())
                    .params(listen_params)
                    .build_batch();

                tracing::debug!("transcribing file: {}", params.file_path);
                let response = client.transcribe_file(&params.file_path).await?;

                tracing::info!("batch transcription completed, emitting response");

                BatchEvent::BatchResponse {
                    session_id: params.session_id.clone(),
                    response,
                }
                .emit(&app)
                .map_err(|e| {
                    crate::Error::BatchStartFailed(format!(
                        "failed to emit BatchResponse event: {e}"
                    ))
                })?;

                Ok(())
            }
            BatchProvider::Soniox => {
                tracing::debug!("using Soniox batch client");

                BatchEvent::BatchStarted {
                    session_id: params.session_id.clone(),
                }
                .emit(&app)
                .map_err(|e| {
                    crate::Error::BatchStartFailed(format!(
                        "failed to emit BatchStarted event: {e}"
                    ))
                })?;

                let client = owhisper_client::ListenClient::builder()
                    .adapter::<owhisper_client::SonioxAdapter>()
                    .api_base(params.base_url.clone())
                    .api_key(params.api_key.clone())
                    .params(listen_params)
                    .build_batch();

                tracing::debug!("transcribing file: {}", params.file_path);
                let response = client.transcribe_file(&params.file_path).await?;

                tracing::info!("Soniox batch transcription completed, emitting response");

                BatchEvent::BatchResponse {
                    session_id: params.session_id.clone(),
                    response,
                }
                .emit(&app)
                .map_err(|e| {
                    crate::Error::BatchStartFailed(format!(
                        "failed to emit BatchResponse event: {e}"
                    ))
                })?;

                Ok(())
            }
        }
    }
}
