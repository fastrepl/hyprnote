// https://github.com/tokio-rs/axum/blob/4f11b45/examples/websockets/src/main.rs#L85

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    Extension,
};
use bytes::Bytes;
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::state::AppState;
use hypr_bridge::{TranscribeInputChunk, TranscribeOutputChunk};
use hypr_stt::{RealtimeSpeechToText, StreamResponse};

pub async fn handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<Mutex<AppState>>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state))
}

async fn websocket(socket: WebSocket, state: Arc<Mutex<AppState>>) {
    let (mut ws_sender, ws_receiver) = socket.split();

    let mut stt = state.lock().await.stt.for_english();

    let input_stream = futures::stream::try_unfold(ws_receiver, |mut ws_receiver| async move {
        match ws_receiver.next().await {
            Some(Ok(Message::Text(_data))) => {
                Ok::<Option<(Bytes, _)>, axum::Error>(Some((Bytes::new(), ws_receiver)))
            }
            _ => Ok::<Option<(Bytes, _)>, axum::Error>(Some((Bytes::new(), ws_receiver))),
        }
    });
    let input_stream = Box::pin(input_stream);

    tokio::spawn(async move {
        match stt.transcribe(input_stream).await {
            Err(e) => {
                eprintln!("transcription error: {:?}", e);
            }

            Ok(mut transcript_stream) => {
                while let Some(result) = transcript_stream.next().await {
                    match result {
                        Ok(input) => {
                            let output = TranscribeOutputChunk { text: input.text };
                            let msg = Message::Text(serde_json::to_string(&output).unwrap());
                            if let Err(e) = ws_sender.send(msg).await {
                                eprintln!("websocket send error: {:?}", e);
                                break;
                            }
                        }
                        Err(e) => {
                            eprintln!("transcription error: {:?}", e);
                            break;
                        }
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        future::IntoFuture,
        net::{Ipv4Addr, SocketAddr},
    };

    fn app() -> axum::Router {
        axum::Router::new().route("/ws", axum::routing::get(handler))
    }

    // https://github.com/tokio-rs/axum/blob/4f11b45/examples/testing-websockets/src/main.rs#L104
    #[tokio::test]
    async fn integration_test() {
        let listener = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)))
            .await
            .unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(axum::serve(listener, app()).into_future());

        let _ = hypr_bridge::Client::builder()
            .with_base(format!("http://localhost:{}", addr.port()))
            .with_token("")
            .build()
            .unwrap();
    }
}
