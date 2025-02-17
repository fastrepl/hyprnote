use axum::response::IntoResponse;
use axum::{
    extract::State as AxumState,
    response::Json,
    routing::{get, post},
    Router,
};
use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;
use tokio::sync::Mutex;

use async_openai::types::{CreateChatCompletionRequest, CreateChatCompletionResponse};

struct State {
    model: Option<crate::inference::Model>,
}

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    shutdown: tokio::sync::watch::Sender<()>,
}

impl ServerHandle {
    pub fn shutdown(self) -> Result<(), tokio::sync::watch::error::SendError<()>> {
        self.shutdown.send(())
    }
}

pub async fn run_server() -> anyhow::Result<ServerHandle> {
    let state = Arc::new(Mutex::new(State { model: None }));

    let app = Router::new()
        .route("/chat/completions", post(chat_completions))
        .route("/health", get(health))
        .with_state(state.clone());

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0))).await?;

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

async fn chat_completions(
    AxumState(state): AxumState<Arc<Mutex<State>>>,
    Json(payload): Json<CreateChatCompletionRequest>,
) -> Result<Json<CreateChatCompletionResponse>, String> {
    let mut state = state.lock().await;
    let _res = state.model.as_mut().unwrap().generate("hello");

    let res = CreateChatCompletionResponse {
        id: "cmpl-123".to_string(),
        object: "chat.completion".to_string(),
        created: 1713423423,
        model: "gpt-3.5-turbo".to_string(),
        choices: vec![],
        usage: None,
        service_tier: None,
        system_fingerprint: None,
    };
    Ok(Json(res))
}

async fn health() -> impl IntoResponse {
    "ok"
}
