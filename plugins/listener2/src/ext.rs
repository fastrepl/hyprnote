use std::future::Future;
use std::sync::{Arc, Mutex};

use owhisper_client::BatchSttAdapter;
use tauri_specta::Event;

use crate::batch::{spawn_batch_actor, BatchArgs};
use crate::BatchEvent;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum BatchProvider {
    Deepgram,
    Soniox,
    AssemblyAI,
    Am,
    HyprnoteCloud,
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
    #[serde(default)]
    pub cloud_file_id: Option<String>,
    #[serde(default)]
    pub authorization: Option<String>,
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
            BatchProvider::Am => run_batch_am(app, params, listen_params).await,
            BatchProvider::Deepgram => {
                run_batch_with_adapter::<owhisper_client::DeepgramAdapter>(
                    app,
                    params,
                    listen_params,
                )
                .await
            }
            BatchProvider::Soniox => {
                run_batch_with_adapter::<owhisper_client::SonioxAdapter>(app, params, listen_params)
                    .await
            }
            BatchProvider::AssemblyAI => {
                run_batch_with_adapter::<owhisper_client::AssemblyAIAdapter>(
                    app,
                    params,
                    listen_params,
                )
                .await
            }
            BatchProvider::HyprnoteCloud => run_batch_hyprnote_cloud(app, params).await,
        }
    }
}

async fn run_batch_hyprnote_cloud(
    app: tauri::AppHandle,
    params: BatchParams,
) -> Result<(), crate::Error> {
    let cloud_file_id = params.cloud_file_id.clone().ok_or_else(|| {
        crate::Error::BatchStartFailed("cloud_file_id is required for HyprnoteCloud".to_string())
    })?;
    let authorization = params.authorization.clone().ok_or_else(|| {
        crate::Error::BatchStartFailed("authorization is required for HyprnoteCloud".to_string())
    })?;

    BatchEvent::BatchStarted {
        session_id: params.session_id.clone(),
    }
    .emit(&app)
    .map_err(|e| {
        crate::Error::BatchStartFailed(format!("failed to emit BatchStarted event: {e}"))
    })?;

    let client = reqwest::Client::new();
    let base_url = params.base_url.trim_end_matches('/').to_string();

    let start_response = client
        .post(format!("{}/file-transcription/start", &base_url))
        .header("Authorization", format!("Bearer {}", authorization))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "fileId": cloud_file_id
        }))
        .send()
        .await
        .map_err(|e| {
            crate::Error::BatchStartFailed(format!("failed to start transcription: {e}"))
        })?;

    if !start_response.status().is_success() {
        let error_text = start_response.text().await.unwrap_or_default();
        BatchEvent::BatchFailed {
            session_id: params.session_id.clone(),
            error: format!("failed to start transcription: {}", error_text),
        }
        .emit(&app)
        .ok();
        return Err(crate::Error::BatchStartFailed(format!(
            "failed to start transcription: {}",
            error_text
        )));
    }

    #[derive(serde::Deserialize)]
    struct StartResponse {
        #[serde(rename = "pipelineId")]
        pipeline_id: String,
    }

    let start_result: StartResponse = start_response.json().await.map_err(|e| {
        crate::Error::BatchStartFailed(format!("failed to parse start response: {e}"))
    })?;

    let pipeline_id = start_result.pipeline_id;
    tracing::info!(
        "hyprnote cloud batch started with pipeline_id: {}",
        pipeline_id
    );

    let session_id = params.session_id.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        let poll_interval = std::time::Duration::from_millis(1500);
        let max_attempts = 120;

        for attempt in 0..max_attempts {
            tokio::time::sleep(poll_interval).await;

            let status_response = match client
                .get(format!(
                    "{}/file-transcription/status/{}",
                    base_url, pipeline_id
                ))
                .header("Authorization", format!("Bearer {}", authorization))
                .send()
                .await
            {
                Ok(resp) => resp,
                Err(e) => {
                    tracing::warn!("poll attempt {} failed: {}", attempt, e);
                    continue;
                }
            };

            if !status_response.status().is_success() {
                tracing::warn!(
                    "poll attempt {} returned status: {}",
                    attempt,
                    status_response.status()
                );
                continue;
            }

            #[derive(serde::Deserialize)]
            struct StatusResponse {
                status: String,
                #[serde(rename = "providerResponse")]
                provider_response: Option<String>,
                error: Option<String>,
            }

            let status: StatusResponse = match status_response.json().await {
                Ok(s) => s,
                Err(e) => {
                    tracing::warn!("poll attempt {} failed to parse response: {}", attempt, e);
                    continue;
                }
            };

            tracing::debug!("poll attempt {}: status = {}", attempt, status.status);

            match status.status.as_str() {
                "DONE" => {
                    if let Some(provider_response) = status.provider_response {
                        BatchEvent::BatchCloudResponse {
                            session_id: session_id.clone(),
                            provider_response,
                        }
                        .emit(&app_clone)
                        .ok();
                    }
                    tracing::info!("hyprnote cloud batch completed");
                    return;
                }
                "ERROR" => {
                    let error_msg = status.error.unwrap_or_else(|| "Unknown error".to_string());
                    BatchEvent::BatchFailed {
                        session_id: session_id.clone(),
                        error: error_msg,
                    }
                    .emit(&app_clone)
                    .ok();
                    tracing::error!("hyprnote cloud batch failed");
                    return;
                }
                "QUEUED" | "TRANSCRIBING" => {
                    continue;
                }
                _ => {
                    tracing::warn!("unknown status: {}", status.status);
                    continue;
                }
            }
        }

        BatchEvent::BatchFailed {
            session_id: session_id.clone(),
            error: "timeout waiting for transcription".to_string(),
        }
        .emit(&app_clone)
        .ok();
        tracing::error!("hyprnote cloud batch timed out");
    });

    Ok(())
}

async fn run_batch_with_adapter<A: BatchSttAdapter>(
    app: tauri::AppHandle,
    params: BatchParams,
    listen_params: owhisper_interface::ListenParams,
) -> Result<(), crate::Error> {
    BatchEvent::BatchStarted {
        session_id: params.session_id.clone(),
    }
    .emit(&app)
    .map_err(|e| {
        crate::Error::BatchStartFailed(format!("failed to emit BatchStarted event: {e}"))
    })?;

    let client = owhisper_client::BatchClient::<A>::builder()
        .api_base(params.base_url.clone())
        .api_key(params.api_key.clone())
        .params(listen_params)
        .build();

    tracing::debug!("transcribing file: {}", params.file_path);
    let response = client.transcribe_file(&params.file_path).await?;

    tracing::info!("batch transcription completed");

    BatchEvent::BatchResponse {
        session_id: params.session_id.clone(),
        response,
    }
    .emit(&app)
    .map_err(|e| {
        crate::Error::BatchStartFailed(format!("failed to emit BatchResponse event: {e}"))
    })?;

    Ok(())
}

async fn run_batch_am(
    app: tauri::AppHandle,
    params: BatchParams,
    listen_params: owhisper_interface::ListenParams,
) -> Result<(), crate::Error> {
    let (start_tx, start_rx) = tokio::sync::oneshot::channel::<std::result::Result<(), String>>();
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
                    let _ = tx.send(Err(format!("failed to spawn batch supervisor: {e:?}")));
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
            tracing::error!("batch actor start notifier dropped before reporting result");
            Err(crate::Error::BatchStartFailed(
                "batch stream start cancelled unexpectedly".to_string(),
            ))
        }
    }
}
