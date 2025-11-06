use std::path::PathBuf;
use std::time::Duration;

use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{batch, ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;
use tokio_stream::{self as tokio_stream, StreamExt as TokioStreamExt};

use crate::SessionEvent;

const RESAMPLED_SAMPLE_RATE_HZ: u32 = 16_000;
const BATCH_STREAM_TIMEOUT_SECS: u64 = 10;
const DEFAULT_CHUNK_MS: u64 = 500;
const DEFAULT_DELAY_MS: u64 = 80;

pub enum BatchMsg {
    StreamResponse(StreamResponse),
    StreamError(String),
    StreamEnded,
    StreamStartFailed(String),
    StreamAudioDuration(f64),
}

#[derive(Clone)]
pub struct BatchArgs {
    pub app: tauri::AppHandle,
    pub file_path: String,
    pub base_url: String,
    pub api_key: String,
    pub listen_params: owhisper_interface::ListenParams,
}

pub struct BatchState {
    pub app: tauri::AppHandle,
    pub accumulator: BatchResponseBuilder,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    audio_duration_secs: Option<f64>,
    transcript_duration_secs: f64,
}

impl BatchState {
    fn on_transcript_progress(&mut self, progress: f64) -> Result<(), ActorProcessingErr> {
        if !progress.is_finite() || progress < 0.0 || progress <= self.transcript_duration_secs {
            return Ok(());
        }

        self.transcript_duration_secs = progress;
        emit_batch_progress(self)
    }

    fn on_audio_duration(&mut self, duration: f64) -> Result<(), ActorProcessingErr> {
        let clamped = if duration.is_finite() && duration >= 0.0 {
            duration
        } else {
            0.0
        };

        self.audio_duration_secs = Some(clamped);
        if self.transcript_duration_secs > clamped {
            self.transcript_duration_secs = clamped;
        }

        emit_batch_progress(self)
    }

    fn take_response(&mut self) -> batch::Response {
        std::mem::replace(&mut self.accumulator, BatchResponseBuilder::new(1)).build()
    }
}

pub struct BatchActor;

impl BatchActor {
    pub fn name() -> ActorName {
        "batch_actor".into()
    }
}

impl Actor for BatchActor {
    type Msg = BatchMsg;
    type State = BatchState;
    type Arguments = BatchArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let (rx_task, shutdown_tx) = spawn_batch_task(args.clone(), myself).await?;

        let accumulator = BatchResponseBuilder::new(1);

        let state = BatchState {
            app: args.app,
            accumulator,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
            audio_duration_secs: None,
            transcript_duration_secs: 0.0,
        };

        Ok(state)
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(shutdown_tx) = state.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
            let _ = (&mut state.rx_task).await;
        }
        Ok(())
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            BatchMsg::StreamResponse(response) => {
                tracing::info!("batch stream response received");
                let transcript_progress = transcript_end_from_response(&response);
                state.accumulator.ingest(response);

                if let Some(progress) = transcript_progress {
                    state.on_transcript_progress(progress)?;
                }
            }

            BatchMsg::StreamAudioDuration(duration) => {
                tracing::info!("batch stream audio duration seconds: {duration}");
                state.on_audio_duration(duration)?;
            }

            BatchMsg::StreamStartFailed(error) => {
                tracing::info!("batch_stream_start_failed: {}", error);
                myself.stop(Some(format!("batch_stream_start_failed: {}", error)));
            }

            BatchMsg::StreamError(error) => {
                tracing::info!("batch_stream_error: {}", error);
                myself.stop(None);
            }

            BatchMsg::StreamEnded => {
                tracing::info!("batch_stream_ended");

                let batch_response = state.take_response();

                SessionEvent::BatchResponse {
                    response: batch_response,
                }
                .emit(&state.app)?;

                emit_batch_progress(state)?;

                myself.stop(None);
            }
        }
        Ok(())
    }
}

#[derive(Clone, Copy)]
struct BatchStreamConfig {
    chunk_ms: u64,
    delay_ms: u64,
}

impl BatchStreamConfig {
    fn new(chunk_ms: u64, delay_ms: u64) -> Self {
        Self {
            chunk_ms: chunk_ms.max(1),
            delay_ms,
        }
    }

    fn chunk_samples(&self) -> usize {
        let samples =
            ((self.chunk_ms as u128).saturating_mul(RESAMPLED_SAMPLE_RATE_HZ as u128) + 999) / 1000;
        let samples = samples.max(1);
        samples.min(usize::MAX as u128) as usize
    }

    fn chunk_interval(&self) -> Duration {
        Duration::from_millis(self.delay_ms)
    }
}

async fn spawn_batch_task(
    args: BatchArgs,
    myself: ActorRef<BatchMsg>,
) -> Result<
    (
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let rx_task = tokio::spawn(async move {
        tracing::info!("batch task: loading audio chunks from file");
        let stream_config = BatchStreamConfig::new(DEFAULT_CHUNK_MS, DEFAULT_DELAY_MS);

        let chunk_samples = stream_config.chunk_samples();
        let chunk_result = tokio::task::spawn_blocking({
            let path = PathBuf::from(&args.file_path);
            move || {
                hypr_audio_utils::chunk_audio_file(path, RESAMPLED_SAMPLE_RATE_HZ, chunk_samples)
            }
        })
        .await;

        let chunked_audio = match chunk_result {
            Ok(Ok(data)) => {
                tracing::info!("batch task: loaded {} audio chunks", data.chunks.len());
                data
            }
            Ok(Err(e)) => {
                tracing::error!("batch task: failed to load audio chunks: {:?}", e);
                let _ = myself.send_message(BatchMsg::StreamStartFailed(format!("{:?}", e)));
                return;
            }
            Err(join_err) => {
                tracing::error!(
                    "batch task: audio chunk loading task panicked: {:?}",
                    join_err
                );
                let _ = myself.send_message(BatchMsg::StreamStartFailed(format!("{:?}", join_err)));
                return;
            }
        };

        let sample_count = chunked_audio.sample_count;
        let audio_duration_secs = if sample_count == 0 {
            0.0
        } else {
            sample_count as f64 / RESAMPLED_SAMPLE_RATE_HZ as f64
        };
        let _ = myself.send_message(BatchMsg::StreamAudioDuration(audio_duration_secs));

        tracing::debug!("batch task: creating listen client");
        let client = owhisper_client::ListenClient::builder()
            .api_base(args.base_url)
            .api_key(args.api_key)
            .params(args.listen_params)
            .build_single();

        let chunk_count = chunked_audio.chunks.len();
        let chunk_interval = stream_config.chunk_interval();

        let audio_stream =
            tokio_stream::iter(chunked_audio.chunks.into_iter().map(MixedMessage::Audio));
        let finalize_stream =
            tokio_stream::iter(vec![MixedMessage::Control(ControlMessage::Finalize)]);
        let outbound = TokioStreamExt::throttle(
            TokioStreamExt::chain(audio_stream, finalize_stream),
            chunk_interval,
        );

        tracing::info!(
            "batch task: starting audio stream with {} chunks + finalize message",
            chunk_count
        );
        let (listen_stream, _handle) = match client.from_realtime_audio(Box::pin(outbound)).await {
            Ok(res) => res,
            Err(e) => {
                tracing::error!("batch task: failed to start audio stream: {:?}", e);
                let _ = myself.send_message(BatchMsg::StreamStartFailed(format!("{:?}", e)));
                return;
            }
        };
        futures_util::pin_mut!(listen_stream);

        process_batch_stream(listen_stream, myself, shutdown_rx).await;
    });

    Ok((rx_task, shutdown_tx))
}

async fn process_batch_stream<S, E>(
    mut listen_stream: std::pin::Pin<&mut S>,
    myself: ActorRef<BatchMsg>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) where
    S: futures_util::Stream<Item = Result<StreamResponse, E>>,
    E: std::fmt::Debug,
{
    let mut response_count = 0;
    let response_timeout = Duration::from_secs(BATCH_STREAM_TIMEOUT_SECS);

    loop {
        tracing::debug!(
            "batch stream: waiting for next item (received {} so far)",
            response_count
        );

        tokio::select! {
            _ = &mut shutdown_rx => {
                tracing::info!("batch_stream_shutdown");
                break;
            }
            result = tokio::time::timeout(
                response_timeout,
                futures_util::StreamExt::next(&mut listen_stream),
            ) => {
                tracing::debug!("batch stream: received result");
                match result {
                    Ok(Some(Ok(response))) => {
                        response_count += 1;

                        let is_from_finalize = matches!(
                            &response,
                            StreamResponse::TranscriptResponse { from_finalize, .. } if *from_finalize
                        );

                        tracing::info!(
                            "batch stream: sending response #{}{}",
                            response_count,
                            if is_from_finalize { " (from_finalize)" } else { "" }
                        );

                        let _ = myself.send_message(BatchMsg::StreamResponse(response));

                        if is_from_finalize {
                            let _ = myself.send_message(BatchMsg::StreamEnded);
                            break;
                        }
                    }
                    Ok(Some(Err(e))) => {
                        tracing::error!("batch stream error: {:?}", e);
                        let _ = myself.send_message(BatchMsg::StreamError(format!("{:?}", e)));
                        break;
                    }
                    Ok(None) => {
                        tracing::info!("batch stream completed (total responses: {})", response_count);
                        let _ = myself.send_message(BatchMsg::StreamEnded);
                        break;
                    }
                    Err(elapsed) => {
                        tracing::warn!(timeout = ?elapsed, responses = response_count, "batch stream response timeout");
                        let _ = myself.send_message(BatchMsg::StreamError("timeout waiting for batch stream response".into()));
                        break;
                    }
                }
            }
        }
    }

    tracing::info!("batch stream processing loop exited");
}

pub struct BatchResponseBuilder {
    metadata: Option<serde_json::Value>,
    channels: Vec<Option<batch::Alternatives>>,
}

impl BatchResponseBuilder {
    fn new(channel_count: u8) -> Self {
        let count = channel_count.clamp(1, 2) as usize;
        Self {
            metadata: None,
            channels: vec![None; count],
        }
    }

    fn ingest(&mut self, response: StreamResponse) {
        let StreamResponse::TranscriptResponse {
            is_final,
            channel,
            metadata,
            channel_index,
            ..
        } = response
        else {
            return;
        };

        if !is_final {
            return;
        }

        self.metadata.get_or_insert_with(|| metadata.into());

        let target_index = channel_index
            .iter()
            .find_map(|idx| usize::try_from(*idx).ok())
            .unwrap_or(0);

        if let Some(slot) = self.channels.get_mut(target_index) {
            if let Some(alternative) = channel
                .alternatives
                .into_iter()
                .next()
                .map(batch::Alternatives::from)
            {
                if !alternative_has_content(&alternative) {
                    return;
                }

                match slot {
                    Some(existing) => merge_alternative(existing, alternative),
                    None => *slot = Some(alternative),
                }
            }
        }
    }

    fn build(self) -> batch::Response {
        let metadata = self.metadata.unwrap_or_else(|| serde_json::json!({}));
        let channels = self
            .channels
            .into_iter()
            .map(|alternative| batch::Channel {
                alternatives: alternative.into_iter().collect(),
            })
            .collect();

        batch::Response {
            metadata,
            results: batch::Results { channels },
        }
    }
}

fn alternative_has_content(alternative: &batch::Alternatives) -> bool {
    !alternative.transcript.trim().is_empty() || !alternative.words.is_empty()
}

fn merge_alternative(target: &mut batch::Alternatives, incoming: batch::Alternatives) {
    if !incoming.transcript.is_empty() {
        if !target.transcript.is_empty() {
            target.transcript.push(' ');
        }
        target.transcript.push_str(&incoming.transcript);
    }

    target.words.extend(incoming.words);
    target.confidence = incoming.confidence;
}

fn emit_batch_progress(state: &BatchState) -> Result<(), ActorProcessingErr> {
    if let Some(audio_duration) = state.audio_duration_secs {
        let transcript_duration = state.transcript_duration_secs.clamp(0.0, audio_duration);

        SessionEvent::BatchProgress {
            audio_duration,
            transcript_duration,
        }
        .emit(&state.app)?;
    }

    Ok(())
}

fn transcript_end_from_response(response: &StreamResponse) -> Option<f64> {
    let StreamResponse::TranscriptResponse {
        start,
        duration,
        channel,
        ..
    } = response
    else {
        return None;
    };

    let mut end = (*start + *duration).max(0.0);

    for alternative in &channel.alternatives {
        for word in &alternative.words {
            if word.end.is_finite() {
                end = end.max(word.end);
            }
        }
    }

    if end.is_finite() {
        Some(end)
    } else {
        None
    }
}
