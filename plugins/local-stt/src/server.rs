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

use hypr_chunker::ChunkerExt;
use hypr_listener_interface::{ListenOutputChunk, ListenParams, TranscriptChunk};
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

impl ServerState {
    pub fn try_acquire_connection(&self) -> Option<ConnectionGuard> {
        self.connection_manager.try_acquire_connection()
    }
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
    let guard = state
        .try_acquire_connection()
        .ok_or(StatusCode::TOO_MANY_REQUESTS)?;

    let model_path = state.model_type.model_path(&state.model_cache_dir);
    let language = params.language.try_into().unwrap();

    let model = hypr_whisper::local::Whisper::builder()
        .model_path(model_path.to_str().unwrap())
        .language(language)
        .static_prompt(&params.static_prompt)
        .dynamic_prompt(&params.dynamic_prompt)
        .build();

    Ok(ws.on_upgrade(move |socket| websocket(socket, model, guard)))
}

#[tracing::instrument(skip_all)]
async fn websocket(
    socket: WebSocket,
    model: hypr_whisper::local::Whisper,
    _guard: ConnectionGuard,
) {
    let (mut ws_sender, ws_receiver) = socket.split();
    let mut stream = {
        let audio_source = WebSocketAudioSource::new(ws_receiver, 16 * 1000);
        let chunked =
            audio_source.chunks(hypr_chunker::RMS::new(), std::time::Duration::from_secs(15));
        hypr_whisper::local::TranscribeChunkedAudioStreamExt::transcribe(chunked, model)
    };

    while let Some(chunk) = stream.next().await {
        let text = chunk.text().to_string();
        let start = chunk.start() as u64;
        let duration = chunk.duration() as u64;
        let confidence = chunk.confidence();

        if confidence < 0.2 {
            tracing::warn!(confidence, "skipping_transcript: {}", text);
            continue;
        }

        let data = ListenOutputChunk {
            diarizations: vec![],
            transcripts: vec![TranscriptChunk {
                text,
                start,
                end: start + duration,
                confidence: Some(confidence),
            }],
        };

        let msg = Message::Text(serde_json::to_string(&data).unwrap().into());
        if let Err(e) = ws_sender.send(msg).await {
            tracing::warn!("websocket_send_error: {}", e);
            break;
        }
    }

    let _ = ws_sender.close().await;
}
