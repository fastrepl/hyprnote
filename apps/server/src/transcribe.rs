use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;

use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    Extension,
};

use crate::AppState;

pub async fn handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<Mutex<AppState>>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state))
}

async fn websocket(stream: WebSocket, state: Arc<Mutex<AppState>>) {}
