use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    Extension,
};

use crate::state::AppState;
use hypr_bridge::{TranscribeInputChunk, TranscribeOutputChunk};

pub async fn handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<Mutex<AppState>>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state))
}

async fn websocket(stream: WebSocket, state: Arc<Mutex<AppState>>) {
    let deepgram = state.lock().await.deepgram.clone();
    let (mut tx, mut rx) = stream.split();

    let mut tx_task = tokio::spawn(async move { deepgram.transcription().stream_request() });

    let mut rx_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = rx.next().await {
            println!("this example does not read any messages, but got: {text}");
        }
    });

    tokio::select! {
        _ = (&mut tx_task) => rx_task.abort(),
        _ = (&mut rx_task) => tx_task.abort(),
    };
}
