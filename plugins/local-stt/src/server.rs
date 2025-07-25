use std::{
    net::{Ipv4Addr, SocketAddr},
    path::PathBuf,
};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State as AxumState,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};

use futures_util::{SinkExt, StreamExt};
use tower_http::cors::{self, CorsLayer};

use hypr_chunker::VadExt;
use hypr_listener_interface::{ListenOutputChunk, ListenParams, Word};

use crate::manager::{ConnectionGuard, ConnectionManager};

#[derive(Default)]
pub struct ServerStateBuilder {
    pub model_type: Option<crate::SupportedModel>,
    pub model_cache_dir: Option<PathBuf>,
}

impl ServerStateBuilder {
    pub fn model_cache_dir(mut self, model_cache_dir: PathBuf) -> Self {
        self.model_cache_dir = Some(model_cache_dir);
        self
    }

    pub fn model_type(mut self, model_type: crate::SupportedModel) -> Self {
        self.model_type = Some(model_type);
        self
    }

    pub fn build(self) -> ServerState {
        ServerState {
            model_type: self.model_type.unwrap(),
            model_cache_dir: self.model_cache_dir.unwrap(),
            connection_manager: ConnectionManager::default(),
        }
    }
}

#[derive(Clone)]
pub struct ServerState {
    model_type: crate::SupportedModel,
    model_cache_dir: PathBuf,
    connection_manager: ConnectionManager,
}

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

pub async fn run_server(state: ServerState) -> Result<ServerHandle, crate::Error> {
    let router = Router::new()
        .route("/health", get(health))
        .route("/api/desktop/listen/realtime", get(listen))
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        )
        .with_state(state);

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

    let server_addr = listener.local_addr()?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

    let server_handle = ServerHandle {
        addr: server_addr,
        shutdown: shutdown_tx,
    };

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                shutdown_rx.changed().await.ok();
            })
            .await
            .unwrap();
    });

    tracing::info!("local_stt_server_started {}", server_addr);
    Ok(server_handle)
}

async fn health() -> impl IntoResponse {
    "ok"
}

async fn listen(
    Query(params): Query<ListenParams>,
    ws: WebSocketUpgrade,
    AxumState(state): AxumState<ServerState>,
) -> Result<impl IntoResponse, StatusCode> {
    let guard = state.connection_manager.acquire_connection();

    Ok(ws.on_upgrade(move |socket| async move {
        websocket_with_model(socket, params, state, guard).await
    }))
}

async fn websocket_with_model(
    socket: WebSocket,
    params: ListenParams,
    state: ServerState,
    guard: ConnectionGuard,
) {
    let model_type = state.model_type;
    let model_cache_dir = state.model_cache_dir.clone();
    let model_path = model_cache_dir.join(model_type.file_name());

    let model = hypr_whisper_local::Whisper::builder()
        .model_path(model_path.to_str().unwrap())
        .static_prompt(&params.static_prompt)
        .dynamic_prompt(&params.dynamic_prompt)
        .build();

    let (ws_sender, ws_receiver) = socket.split();

    match params.audio_mode {
        hypr_listener_interface::AudioMode::Single => {
            websocket_single_channel(ws_sender, ws_receiver, model, guard).await;
        }
        hypr_listener_interface::AudioMode::Dual => {
            websocket_dual_channel(ws_sender, ws_receiver, model, guard).await;
        }
    }
}

async fn websocket_single_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
) {
    let audio_source = hypr_ws_utils::WebSocketAudioSource::new(ws_receiver, 16 * 1000);
    let vad_chunks = audio_source.vad_chunks();

    let chunked = hypr_whisper_local::AudioChunkStream(process_vad_stream(vad_chunks, "mixed"));

    let stream = hypr_whisper_local::TranscribeMetadataAudioStreamExt::transcribe(chunked, model);
    process_transcription_stream(ws_sender, stream, guard).await;
}

async fn websocket_dual_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
) {
    let (mic_source, speaker_source) =
        hypr_ws_utils::split_dual_audio_sources(ws_receiver, 16 * 1000);

    let mic_chunked = {
        let mic_vad_chunks = mic_source.vad_chunks();
        hypr_whisper_local::AudioChunkStream(process_vad_stream(mic_vad_chunks, "mic"))
    };

    let speaker_chunked = {
        let speaker_vad_chunks = speaker_source.vad_chunks();
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
                    Some(s) if s == "mic" => Some(hypr_listener_interface::SpeakerIdentity::Unassigned { index: 0 }),
                    Some(s) if s == "speaker" => Some(hypr_listener_interface::SpeakerIdentity::Unassigned { index: 1 }),
                    _ => None,
                };

                let data = ListenOutputChunk {
                    meta: None,
                    words: text
                        .split_whitespace()
                        .filter(|w| !w.is_empty())
                        .map(|w| Word {
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
                    false // This will end the stream
                }
            })
        })
        .filter_map(move |chunk_result| {
            futures_util::future::ready(match chunk_result {
                Err(_) => None, // This shouldn't happen due to take_while above
                Ok(chunk) => Some(hypr_whisper_local::SimpleAudioChunk {
                    samples: chunk.samples,
                    meta: Some(serde_json::json!({ "source": source_name })),
                }),
            })
        })
}
