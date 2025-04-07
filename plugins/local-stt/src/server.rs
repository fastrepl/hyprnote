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
use std::{
    net::{Ipv4Addr, SocketAddr},
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
    sync::Arc,
};
use tower_http::cors::{self, CorsLayer};

use futures_util::{stream::SplitStream, SinkExt, Stream, StreamExt};
use hypr_listener_interface::{ListenInputChunk, ListenOutputChunk, ListenParams, TranscriptChunk};

#[derive(Default)]
pub struct ServerStateBuilder {
    pub model_cache_dir: Option<PathBuf>,
}

impl ServerStateBuilder {
    pub fn model_cache_dir(mut self, model_cache_dir: PathBuf) -> Self {
        self.model_cache_dir = Some(model_cache_dir);
        self
    }

    pub fn build(self) -> ServerState {
        ServerState {
            model_cache_dir: self.model_cache_dir.unwrap(),
            num_connections: Arc::new(AtomicUsize::new(0)),
        }
    }
}

#[derive(Clone)]
pub struct ServerState {
    model_cache_dir: PathBuf,
    num_connections: Arc<AtomicUsize>,
}

impl ServerState {
    fn try_acquire_connection(&self) -> Option<ConnectionGuard> {
        let current = self.num_connections.load(Ordering::SeqCst);
        if current >= 1 {
            return None;
        }

        match self
            .num_connections
            .compare_exchange(0, 1, Ordering::SeqCst, Ordering::SeqCst)
        {
            Ok(_) => Some(ConnectionGuard(self.num_connections.clone())),
            Err(_) => None,
        }
    }
}

struct ConnectionGuard(Arc<AtomicUsize>);

impl Drop for ConnectionGuard {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::SeqCst);
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
        // should match our app server
        .route("/api/native/listen/realtime", get(listen))
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

    Ok(server_handle)
}

async fn health() -> impl IntoResponse {
    "ok"
}

async fn listen(
    Query(_): Query<ListenParams>,
    ws: WebSocketUpgrade,
    AxumState(state): AxumState<ServerState>,
) -> Result<impl IntoResponse, StatusCode> {
    let guard = state
        .try_acquire_connection()
        .ok_or(StatusCode::TOO_MANY_REQUESTS)?;

    // let model_path = format!("{}/model.bin", state.model_cache_dir);
    let model_path = "/Users/yujonglee/dev/company/hyprnote/crates/whisper/model.bin";
    let model = hypr_whisper::local::Whisper::new(model_path);

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
            crate::chunker::FixedChunkStream::new(audio_source, std::time::Duration::from_secs(12));

        hypr_whisper::local::TranscribeChunkedAudioStreamExt::transcribe(chunked, model)
    };

    while let Some(chunk) = stream.next().await {
        let text = chunk.text().to_string();
        let start = chunk.start() as u64;
        let duration = chunk.duration() as u64;

        if chunk.confidence() < 0.8 && text.len() < 12 {
            tracing::warn!("skipping_transcript: {}", text);
            continue;
        }

        let data = ListenOutputChunk::Transcribe(TranscriptChunk {
            text,
            start,
            end: start + duration,
        });

        let msg = Message::Text(serde_json::to_string(&data).unwrap().into());
        if let Err(e) = ws_sender.send(msg).await {
            tracing::warn!("websocket_send_error: {}", e);
            break;
        }
    }

    let _ = ws_sender.close().await;
}

pub struct WebSocketAudioSource {
    receiver: Option<SplitStream<WebSocket>>,
    sample_rate: u32,
}

impl WebSocketAudioSource {
    pub fn new(receiver: SplitStream<WebSocket>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
        }
    }
}

impl kalosm_sound::AsyncSource for WebSocketAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        let receiver = self.receiver.as_mut().unwrap();

        futures_util::stream::unfold(receiver, |receiver| async move {
            let item = receiver.next().await;

            match item {
                Some(Ok(Message::Text(data))) => {
                    let input: ListenInputChunk = serde_json::from_str(&data).unwrap();

                    if input.audio.is_empty() {
                        None
                    } else {
                        let samples: Vec<f32> = input
                            .audio
                            .chunks_exact(2)
                            .map(|chunk| {
                                let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
                                sample as f32 / 32767.0
                            })
                            .collect();

                        Some((samples, receiver))
                    }
                }
                Some(Ok(Message::Close(_))) => None,
                Some(Err(_)) => None,
                _ => Some((Vec::new(), receiver)),
            }
        })
        .flat_map(futures_util::stream::iter)
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
