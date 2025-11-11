use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SpawnErr};
use tauri_specta::Event;
use tokio_stream::{self as tokio_stream, StreamExt as TokioStreamExt};

use crate::SessionEvent;
const BATCH_STREAM_TIMEOUT_SECS: u64 = 5;
const DEFAULT_CHUNK_MS: u64 = 500;
const DEFAULT_DELAY_MS: u64 = 20;

pub enum BatchMsg {
    StreamResponse(StreamResponse),
    StreamError(String),
    StreamEnded,
    StreamStartFailed(String),
    StreamAudioDuration(f64),
}

type BatchStartNotifier = Arc<Mutex<Option<tokio::sync::oneshot::Sender<Result<(), String>>>>>;

#[derive(Clone)]
pub struct BatchArgs {
    pub app: tauri::AppHandle,
    pub file_path: String,
    pub base_url: String,
    pub api_key: String,
    pub listen_params: owhisper_interface::ListenParams,
    pub start_notifier: BatchStartNotifier,
}

pub struct BatchState {
    pub app: tauri::AppHandle,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    audio_duration_secs: Option<f64>,
}

impl BatchState {
    fn on_audio_duration(&mut self, duration: f64) -> Result<(), ActorProcessingErr> {
        let clamped = if duration.is_finite() && duration >= 0.0 {
            duration
        } else {
            0.0
        };

        self.audio_duration_secs = Some(clamped);
        Ok(())
    }

    fn emit_streamed_response(
        &self,
        response: StreamResponse,
        transcript_end: f64,
    ) -> Result<(), ActorProcessingErr> {
        let percentage = if let Some(audio_duration) = self.audio_duration_secs {
            if audio_duration > 0.0 {
                (transcript_end / audio_duration).clamp(0.0, 1.0)
            } else {
                0.0
            }
        } else {
            0.0
        };

        SessionEvent::BatchResponseStreamed {
            response,
            percentage,
        }
        .emit(&self.app)?;
        Ok(())
    }

    fn emit_failure(&self, error: String) -> Result<(), ActorProcessingErr> {
        SessionEvent::BatchFailed { error }.emit(&self.app)?;
        Ok(())
    }
}

pub struct BatchActor;

impl BatchActor {
    pub fn name() -> ActorName {
        "batch_actor".into()
    }
}

pub async fn spawn_batch_actor(args: BatchArgs) -> Result<ActorRef<BatchMsg>, SpawnErr> {
    let (batch_ref, _) = Actor::spawn(Some(BatchActor::name()), BatchActor, args).await?;
    Ok(batch_ref)
}

#[ractor::async_trait]
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

        let state = BatchState {
            app: args.app,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
            audio_duration_secs: None,
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

                let is_final = matches!(
                    &response,
                    StreamResponse::TranscriptResponse { is_final, .. } if *is_final
                );

                if is_final {
                    let transcript_end = transcript_end_from_response(&response);
                    if let Some(end) = transcript_end {
                        state.emit_streamed_response(response, end)?;
                    }
                }
            }

            BatchMsg::StreamAudioDuration(duration) => {
                tracing::info!("batch stream audio duration seconds: {duration}");
                state.on_audio_duration(duration)?;
            }

            BatchMsg::StreamStartFailed(error) => {
                tracing::info!("batch_stream_start_failed: {}", error);
                state.emit_failure(error.clone())?;
                myself.stop(Some(format!("batch_stream_start_failed: {}", error)));
            }

            BatchMsg::StreamError(error) => {
                tracing::info!("batch_stream_error: {}", error);
                state.emit_failure(error.clone())?;
                myself.stop(None);
            }

            BatchMsg::StreamEnded => {
                tracing::info!("batch_stream_ended");
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

    fn chunk_interval(&self) -> Duration {
        Duration::from_millis(self.delay_ms)
    }
}

fn notify_start_result(notifier: &BatchStartNotifier, result: Result<(), String>) {
    if let Ok(mut guard) = notifier.lock() {
        if let Some(sender) = guard.take() {
            let _ = sender.send(result);
        }
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
        let start_notifier = args.start_notifier.clone();

        let chunk_result = tokio::task::spawn_blocking({
            let path = PathBuf::from(&args.file_path);
            let chunk_ms = stream_config.chunk_ms;
            move || hypr_audio_utils::chunk_audio_file(path, chunk_ms)
        })
        .await;

        let chunked_audio = match chunk_result {
            Ok(Ok(data)) => {
                tracing::info!("batch task: loaded {} audio chunks", data.chunks.len());
                data
            }
            Ok(Err(e)) => {
                let error = format!("{:?}", e);
                tracing::error!("batch task: failed to load audio chunks: {:?}", e);
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
            Err(join_err) => {
                let error = format!("{:?}", join_err);
                tracing::error!(
                    "batch task: audio chunk loading task panicked: {:?}",
                    join_err
                );
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
        };

        let frame_count = chunked_audio.frame_count;
        let metadata = chunked_audio.metadata;
        let audio_duration_secs = if frame_count == 0 || metadata.sample_rate == 0 {
            0.0
        } else {
            frame_count as f64 / metadata.sample_rate as f64
        };
        let _ = myself.send_message(BatchMsg::StreamAudioDuration(audio_duration_secs));

        let channel_count = metadata.channels.clamp(1, 2);
        let listen_params = owhisper_interface::ListenParams {
            channels: metadata.channels,
            sample_rate: metadata.sample_rate,
            ..args.listen_params.clone()
        };
        let client = owhisper_client::ListenClient::builder()
            .api_base(args.base_url)
            .api_key(args.api_key)
            .params(listen_params)
            .build_with_channels(channel_count);

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
                let error = format!("{:?}", e);
                tracing::error!("batch task: failed to start audio stream: {:?}", e);
                notify_start_result(&start_notifier, Err(error.clone()));
                let _ = myself.send_message(BatchMsg::StreamStartFailed(error));
                return;
            }
        };
        notify_start_result(&start_notifier, Ok(()));
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

    let _ = myself.send_message(BatchMsg::StreamEnded);
    tracing::info!("batch stream processing loop exited");
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
