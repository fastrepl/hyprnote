use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State as AxumState,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use std::net::{Ipv4Addr, SocketAddr};
use tower_http::cors::{self, CorsLayer};

use futures_util::{stream::SplitStream, SinkExt, Stream, StreamExt};
use hypr_listener_interface::{ListenInputChunk, ListenOutputChunk, ListenParams};

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

pub async fn run_server(state: crate::SharedState) -> anyhow::Result<ServerHandle> {
    let app = Router::new()
        .route("/health", get(health))
        // should match our app server
        .route("/api/native/listen/realtime", get(listen))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        );

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

    let server_addr = listener.local_addr()?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

    let server_handle = ServerHandle {
        addr: server_addr,
        shutdown: shutdown_tx,
    };

    tokio::spawn(async move {
        axum::serve(listener, app)
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
    AxumState(state): AxumState<crate::SharedState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state, params))
}

async fn websocket(socket: WebSocket, state: crate::SharedState, _params: ListenParams) {
    tracing::info!("websocket_connected");

    let (mut ws_sender, ws_receiver) = socket.split();

    let mut stream = {
        let state = state.lock().await;

        if let Some(model) = state.model.as_ref() {
            let audio_source = WebSocketAudioSource::new(ws_receiver, 16 * 1000);
            let chunked = crate::chunker::FixedChunkStream::new(
                audio_source,
                std::time::Duration::from_secs(10),
            );

            rwhisper::TranscribeChunkedAudioStreamExt::transcribe(chunked, model.clone())
        } else {
            tracing::error!("model_not_loaded");
            return;
        }
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
        ws_sender.send(msg).await.unwrap();
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

    use futures_util::StreamExt;
    use tauri_plugin_listener::ListenClientBuilder;

    #[tokio::test]
    #[ignore]
    // cargo test test_listen -p tauri-plugin-local-stt -- --ignored --nocapture
    async fn test_listen() {
        let state = crate::SharedState::default();
        {
            let mut state = state.lock().await;
            state.model = Some(
                crate::model::model_builder(
                    dirs::home_dir()
                        .unwrap()
                        .join("Library/Application Support/com.hyprnote.dev/"),
                )
                .with_source(rwhisper::WhisperSource::QuantizedDistilLargeV3)
                .build()
                .await
                .unwrap(),
            );
        }

        let server = run_server(state).await.unwrap();

        let listen_client = ListenClientBuilder::default()
            .api_base(format!("http://{}", server.addr))
            .api_key("NONE")
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();

        let audio_source = rodio::Decoder::new_wav(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let listen_stream = listen_client.from_audio(audio_source).await.unwrap();
        let mut listen_stream = Box::pin(listen_stream);

        while let Some(chunk) = listen_stream.next().await {
            println!("{:?}", chunk);
        }
    }

    #[tokio::test]
    async fn test_health() {
        let state = crate::SharedState::default();
        let server = run_server(state).await.unwrap();

        let client = reqwest::Client::new();
        let response = client
            .get(format!("http://{}/health", server.addr))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::OK);
    }
}
