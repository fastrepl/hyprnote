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

use hypr_chunker::{ChunkConfig, ChunkerExt, HallucinationPreventionLevel, SmartPredictor};
use hypr_listener_interface::{ListenOutputChunk, ListenParams, Word};
use hypr_ws_utils::WebSocketAudioSource;

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

    let model_path = model_type.model_path(&model_cache_dir);
    let language = params.language.try_into().unwrap_or_else(|e| {
        tracing::error!("convert_to_whisper_language: {e:?}");
        hypr_whisper::Language::En
    });

    let model = hypr_whisper::local::Whisper::builder()
        .model_path(model_path.to_str().unwrap())
        .language(language)
        .static_prompt(&params.static_prompt)
        .dynamic_prompt(&params.dynamic_prompt)
        .build();

    websocket(socket, model, guard).await;
}

/// WebSocket handler for audio streaming and real-time transcription
///
/// Environment variables:
/// - `USE_SMART_PREDICTOR`: "true" (default) or "false" - Use SmartPredictor with multi-feature fusion
/// - `HALLUCINATION_PREVENTION`: "normal", "aggressive" (default), or "paranoid" - Whisper hallucination prevention level
#[tracing::instrument(skip_all)]
async fn websocket(socket: WebSocket, model: hypr_whisper::local::Whisper, guard: ConnectionGuard) {
    let (mut ws_sender, ws_receiver) = socket.split();

    // Configuration from environment variables
    let use_smart_predictor = std::env::var("USE_SMART_PREDICTOR")
        .unwrap_or_else(|_| "true".to_string())
        .parse::<bool>()
        .unwrap_or(true);

    let hallucination_prevention = std::env::var("HALLUCINATION_PREVENTION")
        .unwrap_or_else(|_| "aggressive".to_string())
        .to_lowercase();

    let prevention_level = match hallucination_prevention.as_str() {
        "normal" => HallucinationPreventionLevel::Normal,
        "paranoid" => HallucinationPreventionLevel::Paranoid,
        _ => HallucinationPreventionLevel::Aggressive, // default
    };

    // Create predictor based on configuration
    let (predictor, chunk_config): (
        Box<dyn hypr_chunker::Predictor + Send + Sync + Unpin>,
        ChunkConfig,
    ) = if use_smart_predictor {
        match SmartPredictor::new_realtime(16000) {
            Ok(smart) => {
                tracing::info!("Using SmartPredictor with real-time optimizations");
                let config = ChunkConfig::default().with_hallucination_prevention(prevention_level);
                (Box::new(smart), config)
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to initialize SmartPredictor: {}, falling back to Silero",
                    e
                );
                // Fallback to Silero
                match hypr_chunker::Silero::new() {
                    Ok(silero) => {
                        tracing::info!("Using Silero VAD for audio chunking");
                        let config =
                            ChunkConfig::default().with_hallucination_prevention(prevention_level);
                        (Box::new(silero), config)
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Failed to initialize Silero VAD: {}, falling back to RMS",
                            e
                        );
                        let config = ChunkConfig {
                            max_duration: std::time::Duration::from_secs(15),
                            ..Default::default()
                        }
                        .with_hallucination_prevention(prevention_level);
                        (Box::new(hypr_chunker::RMS::new()), config)
                    }
                }
            }
        }
    } else {
        // Use Silero directly if smart predictor is disabled
        match hypr_chunker::Silero::new() {
            Ok(silero) => {
                tracing::info!("Using Silero VAD for audio chunking");
                let config = ChunkConfig::default().with_hallucination_prevention(prevention_level);
                (Box::new(silero), config)
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to initialize Silero VAD: {}, falling back to RMS",
                    e
                );
                let config = ChunkConfig {
                    max_duration: std::time::Duration::from_secs(15),
                    ..Default::default()
                }
                .with_hallucination_prevention(prevention_level);
                (Box::new(hypr_chunker::RMS::new()), config)
            }
        }
    };

    tracing::info!(
        "Chunking config: max_duration={:?}, hallucination_prevention={:?}, silence_window={:?}",
        chunk_config.max_duration,
        chunk_config.hallucination_prevention,
        chunk_config.silence_window_duration
    );

    let mut stream = {
        let audio_source = WebSocketAudioSource::new(ws_receiver, 16000);
        let chunked = audio_source.chunks_with_config(predictor, chunk_config);
        hypr_whisper::local::TranscribeChunkedAudioStreamExt::transcribe(chunked, model)
    };

    loop {
        tokio::select! {
            _ = guard.cancelled() => {
                tracing::info!("websocket_cancelled_by_new_connection");
                break;
            }
            chunk_opt = stream.next() => {
                let Some(chunk) = chunk_opt else { break };
                let text = chunk.text().to_string();
                let start = chunk.start() as u64;
                let duration = chunk.duration() as u64;
                let confidence = chunk.confidence();

                // Note: With SmartPredictor, we could potentially use lower confidence thresholds
                // since it provides better speech/noise discrimination through multi-feature fusion
                if confidence < 0.4 {
                    tracing::warn!(confidence, "skipping_transcript: {}", text);
                    continue;
                }

                let data = ListenOutputChunk {
                    words: text
                        .split_whitespace()
                        .filter(|w| !w.is_empty())
                        .map(|w| Word {
                            text: w.trim().to_string(),
                            speaker: None,
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
