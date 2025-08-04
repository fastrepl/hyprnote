use std::{
    future::Future,
    path::PathBuf,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        FromRequestParts,
    },
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use futures_util::{SinkExt, StreamExt};
use tower::Service;

use hypr_chunker::VadExt;
use owhisper_interface::{ListenOutputChunk, ListenParams, Word2};

use crate::manager::{ConnectionGuard, ConnectionManager};

#[derive(Clone)]
pub struct WhisperStreamingService {
    model_path: PathBuf,
    connection_manager: ConnectionManager,
}

impl WhisperStreamingService {
    pub fn builder() -> WhisperStreamingServiceBuilder {
        WhisperStreamingServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct WhisperStreamingServiceBuilder {
    model_path: Option<PathBuf>,
    connection_manager: Option<ConnectionManager>,
}

impl WhisperStreamingServiceBuilder {
    pub fn model_path(mut self, model_path: PathBuf) -> Self {
        self.model_path = Some(model_path);
        self
    }

    pub fn build(self) -> WhisperStreamingService {
        WhisperStreamingService {
            model_path: self.model_path.unwrap(),
            connection_manager: self
                .connection_manager
                .unwrap_or_else(ConnectionManager::default),
        }
    }
}

impl<B> Service<Request<B>> for WhisperStreamingService
where
    B: Send + 'static,
{
    type Response = Response;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<B>) -> Self::Future {
        let model_path = self.model_path.clone();
        let connection_manager = self.connection_manager.clone();

        Box::pin(async move {
            let uri = req.uri();
            let query_string = uri.query().unwrap_or("");
            let params: ListenParams = match serde_qs::from_str(query_string) {
                Ok(p) => p,
                Err(_) => {
                    return Ok(StatusCode::BAD_REQUEST.into_response());
                }
            };

            let (mut parts, _body) = req.into_parts();
            let ws_upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                Ok(ws) => ws,
                Err(_) => {
                    return Ok(StatusCode::BAD_REQUEST.into_response());
                }
            };

            let guard = connection_manager.acquire_connection();

            let response = ws_upgrade.on_upgrade(move |socket| async move {
                handle_websocket_connection(socket, params, model_path, guard).await
            });

            Ok(response.into_response())
        })
    }
}

async fn handle_websocket_connection(
    socket: WebSocket,
    params: ListenParams,
    model_path: PathBuf,
    guard: ConnectionGuard,
) {
    let languages: Vec<hypr_whisper::Language> = params
        .languages
        .into_iter()
        .filter_map(|lang| lang.try_into().ok())
        .collect();

    let model = hypr_whisper_local::Whisper::builder()
        .model_path(model_path.to_str().unwrap())
        .languages(languages)
        .static_prompt(&params.static_prompt)
        .dynamic_prompt(&params.dynamic_prompt)
        .build();

    let (ws_sender, ws_receiver) = socket.split();

    match params.audio_mode {
        owhisper_interface::AudioMode::Single => {
            handle_single_channel(
                ws_sender,
                ws_receiver,
                model,
                guard,
                Duration::from_millis(params.redemption_time_ms),
            )
            .await;
        }
        owhisper_interface::AudioMode::Dual => {
            handle_dual_channel(
                ws_sender,
                ws_receiver,
                model,
                guard,
                Duration::from_millis(params.redemption_time_ms),
            )
            .await;
        }
    }
}

async fn handle_single_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
    redemption_time: Duration,
) {
    let audio_source = hypr_ws_utils::WebSocketAudioSource::new(ws_receiver, 16 * 1000);
    let vad_chunks = audio_source.vad_chunks(redemption_time);

    let chunked = hypr_whisper_local::AudioChunkStream(process_vad_stream(vad_chunks, "mixed"));

    let stream = hypr_whisper_local::TranscribeMetadataAudioStreamExt::transcribe(chunked, model);
    process_transcription_stream(ws_sender, stream, guard).await;
}

async fn handle_dual_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
    redemption_time: Duration,
) {
    let (mic_source, speaker_source) =
        hypr_ws_utils::split_dual_audio_sources(ws_receiver, 16 * 1000);

    let mic_chunked = {
        let mic_vad_chunks = mic_source.vad_chunks(redemption_time);
        hypr_whisper_local::AudioChunkStream(process_vad_stream(mic_vad_chunks, "mic"))
    };

    let speaker_chunked = {
        let speaker_vad_chunks = speaker_source.vad_chunks(redemption_time);
        hypr_whisper_local::AudioChunkStream(process_vad_stream(speaker_vad_chunks, "speaker"))
    };

    let merged_stream = hypr_whisper_local::AudioChunkStream(futures_util::stream::select(
        mic_chunked.0,
        speaker_chunked.0,
    ));

    let stream =
        hypr_whisper_local::TranscribeMetadataAudioStreamExt::transcribe(merged_stream, model);

    process_transcription_stream(ws_sender, stream, guard).await;
}

async fn process_transcription_stream(
    mut ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    mut stream: impl futures_util::Stream<Item = hypr_whisper_local::Segment> + Unpin,
    guard: ConnectionGuard,
) {
    loop {
        tokio::select! {
            _ = guard.cancelled() => {
                tracing::info!("websocket_cancelled_by_new_connection");
                break;
            }
            chunk_opt = stream.next() => {
                let Some(chunk) = chunk_opt else { break };

                let meta = chunk.meta();
                let text = chunk.text().to_string();
                let start = chunk.start() as u64;
                let duration = chunk.duration() as u64;
                let confidence = chunk.confidence();

                let source = meta.and_then(|meta|
                    meta.get("source")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                );
                let speaker = match source {
                    Some(s) if s == "mic" => Some(owhisper_interface::SpeakerIdentity::Unassigned { index: 0 }),
                    Some(s) if s == "speaker" => Some(owhisper_interface::SpeakerIdentity::Unassigned { index: 1 }),
                    _ => None,
                };

                let data = ListenOutputChunk {
                    meta: None,
                    words: text
                        .split_whitespace()
                        .filter(|w| !w.is_empty())
                        .map(|w| Word2 {
                            text: w.trim().to_string(),
                            speaker: speaker.clone(),
                            start_ms: Some(start),
                            end_ms: Some(start + duration),
                            confidence: Some(confidence),
                        })
                        .collect(),
                };

                let msg = Message::Text(serde_json::to_string(&data).unwrap().into());
                if let Err(e) = ws_sender.send(msg).await {
                    tracing::warn!("websocket_send_error: {}", e);
                    break;
                }
            }
        }
    }

    let _ = ws_sender.close().await;
}

fn process_vad_stream<S, E>(
    stream: S,
    source_name: &str,
) -> impl futures_util::Stream<Item = hypr_whisper_local::SimpleAudioChunk>
where
    S: futures_util::Stream<Item = Result<hypr_chunker::AudioChunk, E>>,
    E: std::fmt::Display,
{
    let source_name = source_name.to_string();

    stream
        .take_while(move |chunk_result| {
            futures_util::future::ready(match chunk_result {
                Ok(_) => true,
                Err(e) => {
                    tracing::error!("vad_error_disconnecting: {}", e);
                    false
                }
            })
        })
        .filter_map(move |chunk_result| {
            futures_util::future::ready(match chunk_result {
                Err(_) => None,
                Ok(chunk) => Some(hypr_whisper_local::SimpleAudioChunk {
                    samples: chunk.samples,
                    meta: Some(serde_json::json!({ "source": source_name })),
                }),
            })
        })
}
