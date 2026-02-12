use std::time::Duration;

use restate_sdk::context::RunRetryPolicy;
use restate_sdk::prelude::*;
use restate_sdk::serde::Json;
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::soniox;
use crate::supabase;
use hypr_restate_rate_limit::{AllowRequest, RateLimiterClient};
pub use hypr_restate_stt_types::{PipelineStatus, SttStatusResponse};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SttFileInput {
    pub user_id: String,
    pub file_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SttFileOutput {
    pub status: PipelineStatus,
    pub transcript: String,
}

#[restate_sdk::workflow]
pub trait SttFile {
    async fn run(input: Json<SttFileInput>) -> Result<Json<SttFileOutput>, HandlerError>;

    #[shared]
    #[name = "onTranscript"]
    async fn on_transcript(payload: Json<serde_json::Value>) -> Result<(), HandlerError>;

    #[shared]
    #[name = "getStatus"]
    async fn get_status() -> Result<Json<SttStatusResponse>, HandlerError>;
}

pub struct SttFileImpl {
    config: &'static Config,
    client: reqwest::Client,
}

impl SttFileImpl {
    pub fn new(config: &'static Config) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    async fn run_inner(
        &self,
        ctx: &WorkflowContext<'_>,
        input: &SttFileInput,
    ) -> Result<SttFileOutput, HandlerError> {
        if input.file_id.is_empty() {
            return Err(TerminalError::new("file_id cannot be empty").into());
        }
        if input.user_id.is_empty() {
            return Err(TerminalError::new("user_id cannot be empty").into());
        }

        ctx.set("status", Json(PipelineStatus::Queued));
        ctx.set("fileId", Json(input.file_id.clone()));

        ctx.object_client::<RateLimiterClient>(&input.user_id)
            .allow(Json(AllowRequest {
                n: 1,
                limit: 5.0 / 60.0,
                burst: 5,
            }))
            .call()
            .await?;

        ctx.set("status", Json(PipelineStatus::Transcribing));

        let config = self.config;
        let client = self.client.clone();
        let file_id = input.file_id.clone();
        let audio_url: String = ctx
            .run(|| async move {
                supabase::create_signed_url(&client, config, &file_id, 3600)
                    .await
                    .map_err(|e| {
                        TerminalError::new(format!("Failed to create signed URL: {e}")).into()
                    })
            })
            .name("create-signed-url")
            .await?;

        let ingress_url = self.config.restate_ingress_url.trim_end_matches('/');
        let key = ctx.key();
        let encoded_key = urlencoding::encode(key);
        let callback_url = format!("{ingress_url}/SttFile/{encoded_key}/onTranscript");

        let soniox_retry_policy = RunRetryPolicy::default()
            .initial_delay(Duration::from_millis(500))
            .exponentiation_factor(2.0)
            .max_delay(Duration::from_secs(30))
            .max_attempts(5);

        let client = self.client.clone();
        let api_key = self.config.soniox_api_key.clone();
        let audio_url_clone = audio_url.clone();
        let callback_url_clone = callback_url.clone();
        let request_id: String = ctx
            .run(|| async move {
                match soniox::transcribe_with_callback(
                    &client,
                    &audio_url_clone,
                    &callback_url_clone,
                    &api_key,
                )
                .await
                {
                    Ok(id) => Ok(id),
                    Err(e) if !e.is_retryable => Err(TerminalError::new(e.message).into()),
                    Err(e) => Err(e.into()),
                }
            })
            .name("submit-soniox-transcription")
            .retry_policy(soniox_retry_policy.clone())
            .await?;

        ctx.set("providerRequestId", Json(request_id));

        let callback_timeout = ctx.sleep(Duration::from_secs(600));
        let promise = ctx.promise::<String>("transcription_id");

        let transcription_id: String = tokio::select! {
            result = promise => result?,
            result = callback_timeout => {
                result?;
                return Err(TerminalError::new("Timed out waiting for Soniox callback").into());
            }
        };

        let client = self.client.clone();
        let api_key = self.config.soniox_api_key.clone();
        let transcript: String = ctx
            .run(|| async move {
                soniox::fetch_transcript(&client, &transcription_id, &api_key)
                    .await
                    .map_err(|e| {
                        if e.is_retryable {
                            e.into()
                        } else {
                            TerminalError::new(e.message).into()
                        }
                    })
            })
            .name("fetch-soniox-transcript")
            .retry_policy(soniox_retry_policy)
            .await?;

        ctx.set("transcript", Json(transcript.clone()));
        ctx.set("status", Json(PipelineStatus::Done));

        Ok(SttFileOutput {
            status: PipelineStatus::Done,
            transcript,
        })
    }
}

impl SttFile for SttFileImpl {
    async fn run(
        &self,
        ctx: WorkflowContext<'_>,
        input: Json<SttFileInput>,
    ) -> Result<Json<SttFileOutput>, HandlerError> {
        let input = input.into_inner();
        tracing::info!(file_id = %input.file_id, user_id = %input.user_id, "stt workflow started");

        let file_id = input.file_id.clone();
        let result = self.run_inner(&ctx, &input).await;

        if let Err(ref e) = result {
            tracing::error!(file_id = %file_id, error = ?e, "stt workflow failed");
            ctx.set("status", Json(PipelineStatus::Error));
            ctx.set("error", Json(format!("{:?}", e)));
        } else {
            tracing::info!(file_id = %file_id, "stt workflow completed");
        }

        let config = self.config;
        let client = self.client.clone();
        let _ = ctx
            .run(|| async move {
                if let Err(e) = supabase::delete_file(&client, config, &file_id).await {
                    tracing::error!(file_id = %file_id, error = %e, "failed to delete audio file");
                }
                Ok(())
            })
            .name("delete-audio-file")
            .await;

        result.map(Json)
    }

    async fn on_transcript(
        &self,
        ctx: SharedWorkflowContext<'_>,
        payload: Json<serde_json::Value>,
    ) -> Result<(), HandlerError> {
        let payload = payload.into_inner();
        let existing = ctx.get::<Json<String>>("transcript").await?;
        if existing.is_some() {
            return Ok(());
        }

        let callback: soniox::SonioxCallback =
            serde_json::from_value(payload).map_err(|e| TerminalError::new(e.to_string()))?;

        if callback.status == "error" {
            ctx.reject_promise(
                "transcription_id",
                TerminalError::new("Soniox transcription failed"),
            );
            return Ok(());
        }

        ctx.resolve_promise("transcription_id", callback.id);
        Ok(())
    }

    async fn get_status(
        &self,
        ctx: SharedWorkflowContext<'_>,
    ) -> Result<Json<SttStatusResponse>, HandlerError> {
        let status = ctx
            .get::<Json<PipelineStatus>>("status")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or(PipelineStatus::Queued);
        let transcript = ctx
            .get::<Json<String>>("transcript")
            .await?
            .map(|j| j.into_inner());
        let error = ctx
            .get::<Json<String>>("error")
            .await?
            .map(|j| j.into_inner());

        Ok(Json(SttStatusResponse {
            status,
            transcript,
            error,
        }))
    }
}
