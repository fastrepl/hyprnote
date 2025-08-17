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

use hypr_vad::VadExt;
use hypr_ws_utils::{ConnectionGuard, ConnectionManager};
use owhisper_interface::{Alternatives, Channel, ListenParams, Metadata, StreamResponse, Word};

#[derive(Clone)]
pub struct TranscribeService {
    model_path: PathBuf,
    connection_manager: ConnectionManager,
}

impl TranscribeService {
    pub fn builder() -> TranscribeServiceBuilder {
        TranscribeServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct TranscribeServiceBuilder {
    model_path: Option<PathBuf>,
    connection_manager: Option<ConnectionManager>,
}

impl TranscribeServiceBuilder {
    pub fn model_path(mut self, model_path: PathBuf) -> Self {
        self.model_path = Some(model_path);
        self
    }

    pub fn build(self) -> TranscribeService {
        TranscribeService {
            model_path: self.model_path.unwrap(),
            connection_manager: self
                .connection_manager
                .unwrap_or_else(ConnectionManager::default),
        }
    }
}

impl<B> Service<Request<B>> for TranscribeService
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
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let (mut parts, _body) = req.into_parts();
            let ws_upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                Ok(ws) => ws,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let model = match hypr_whisper_local::Whisper::builder()
                .model_path(model_path.to_str().unwrap())
                .languages(
                    params
                        .languages
                        .iter()
                        .filter_map(|lang| lang.clone().try_into().ok())
                        .collect::<Vec<hypr_whisper::Language>>(),
                )
                .build()
            {
                Ok(model) => model,
                Err(e) => {
                    let res = (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("failed_to_build_whisper: {}", e),
                    )
                        .into_response();
                    return Ok(res);
                }
            };

            let guard = connection_manager.acquire_connection();

            Ok(ws_upgrade
                .on_upgrade(move |socket| async move {
                    handle_websocket_connection(socket, params, model, guard).await;
                })
                .into_response())
        })
    }
}

async fn handle_websocket_connection(
    socket: WebSocket,
    params: ListenParams,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
) {
    let (ws_sender, ws_receiver) = socket.split();

    let redemption_time = params
        .redemption_time_ms
        .map(|ms| Duration::from_millis(ms))
        .unwrap_or(Duration::from_millis(500));

    match params.channels {
        1 => {
            handle_single_channel(ws_sender, ws_receiver, model, guard, redemption_time).await;
        }
        _ => {
            handle_dual_channel(ws_sender, ws_receiver, model, guard, redemption_time).await;
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
    let vad_chunks = audio_source.speech_chunks(redemption_time);

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
        let mic_vad_chunks = mic_source.speech_chunks(redemption_time);
        hypr_whisper_local::AudioChunkStream(process_vad_stream(mic_vad_chunks, "mic"))
    };

    let speaker_chunked = {
        let speaker_vad_chunks = speaker_source.speech_chunks(redemption_time);
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
                let language = chunk.language().map(|s| s.to_string()).map(|s| vec![s]).unwrap_or_default();
                let start_f64 = chunk.start() as f64;
                let duration_f64 = chunk.duration() as f64;
                let confidence = chunk.confidence() as f64;

                let source = meta.and_then(|meta|
                    meta.get("source")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                );

                let (speaker, channel_index) = match source.as_deref() {
                    Some("mic") => (Some(0), vec![0]),
                    Some("speaker") => (Some(1), vec![1]),
                    _ => (None, vec![0]),
                };

                let words: Vec<Word> = text
                    .split_whitespace()
                    .filter(|w| !w.is_empty())
                    .map(|w| Word {
                        word: w.to_string(),
                        start: start_f64,
                        end: start_f64 + duration_f64,
                        confidence,
                        speaker: speaker.clone(),
                        punctuated_word: None,
                        language: None,
                    })
                    .collect();

                let response = StreamResponse::TranscriptResponse {
                    type_field: "Results".to_string(),
                    start: start_f64,
                    duration: duration_f64,
                    is_final: true,
                    speech_final: true,
                    from_finalize: false,
                    channel: Channel{
                        alternatives: vec![Alternatives{
                            transcript: text.clone(),
                            languages: language.clone(),
                            words,
                            confidence,
                        }],
                    },
                    metadata: Metadata::default(),
                    channel_index,
                };

                let msg = Message::Text(serde_json::to_string(&response).unwrap().into());
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
    S: futures_util::Stream<Item = Result<hypr_vad::AudioChunk, E>>,
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
