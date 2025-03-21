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
};
use tower_http::cors::{self, CorsLayer};

use futures_util::{stream::SplitStream, SinkExt, Stream, StreamExt};
use hypr_listener_interface::{ListenInputChunk, ListenOutputChunk, ListenParams};

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

#[derive(Clone)]
pub struct ServerState {
    pub cache_dir: PathBuf,
    pub model_type: rwhisper::WhisperSource,
}

pub async fn run_server(state: ServerState) -> anyhow::Result<ServerHandle> {
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
    Query(params): Query<ListenParams>,
    ws: WebSocketUpgrade,
    AxumState(state): AxumState<ServerState>,
) -> Result<impl IntoResponse, StatusCode> {
    let model = rwhisper::WhisperBuilder::default()
        .with_cache(kalosm_common::Cache::new(state.cache_dir))
        .with_language(None)
        .with_source(state.model_type)
        .build()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(ws.on_upgrade(move |socket| websocket(socket, params, model)))
}

async fn websocket(socket: WebSocket, _params: ListenParams, model: rwhisper::Whisper) {
    tracing::info!("websocket_connected");

    let (mut ws_sender, ws_receiver) = socket.split();
    let mut stream = {
        let audio_source = WebSocketAudioSource::new(ws_receiver, 16 * 1000);
        let chunked =
            crate::chunker::FixedChunkStream::new(audio_source, std::time::Duration::from_secs(10));
        rwhisper::TranscribeChunkedAudioStreamExt::transcribe(chunked, model)
    };

    tracing::info!("stream_started");

    while let Some(chunk) = stream.next().await {
        let text = chunk.text().to_string();
        let start = chunk.start() as u64;
        let duration = chunk.duration() as u64;

        let data = ListenOutputChunk::Transcribe(hypr_db_user::TranscriptChunk {
            text,
            start,
            end: start + duration,
        });

        let msg = Message::Text(serde_json::to_string(&data).unwrap().into());
        match ws_sender.send(msg).await {
            Ok(_) => {}
            Err(e) => {
                tracing::warn!("websocket_send_error: {}", e);
            }
        }
    }

    ws_sender.close().await.unwrap();
    tracing::info!("websocket_disconnected");
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
                _ => None,
            }
        })
        .flat_map(futures_util::stream::iter)
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health() {
        let state = ServerState {
            cache_dir: "/Users/yujonglee/Library/Application Support/com.hyprnote.dev/".into(),
            model_type: rwhisper::WhisperSource::QuantizedDistilLargeV3,
        };

        let server = run_server(state).await.unwrap();
        let client = reqwest::Client::new();

        assert_eq!(
            client
                .get(format!("http://{}/health", server.addr))
                .send()
                .await
                .unwrap()
                .status(),
            axum::http::StatusCode::OK
        );
    }
}
