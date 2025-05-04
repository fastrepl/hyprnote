// https://github.com/tokio-rs/axum/blob/4f11b45/examples/websockets/src/main.rs#L85

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};

use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};

use hypr_listener_interface::{ListenInputChunk, ListenOutputChunk, ListenParams, TranscriptChunk};
use hypr_stt::realtime::RealtimeSpeechToText;

use crate::state::STTState;

pub async fn handler(
    Query(params): Query<ListenParams>,
    ws: WebSocketUpgrade,
    State(state): State<STTState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state, params))
}

async fn websocket(socket: WebSocket, state: STTState, params: ListenParams) {
    tracing::info!("websocket_connected");

    let (mut ws_sender, ws_receiver) = socket.split();

    let mut stt = state.realtime_stt.for_language(params.language).await;

    let input_stream =
        futures_util::stream::try_unfold(ws_receiver, |mut ws_receiver| async move {
            match ws_receiver.next().await {
                Some(Ok(Message::Text(data))) => {
                    let input: ListenInputChunk = serde_json::from_str(&data).unwrap();
                    let audio = Bytes::from(input.audio);
                    Ok::<Option<(Bytes, _)>, axum::Error>(Some((audio, ws_receiver)))
                }
                _ => Ok::<Option<(Bytes, _)>, axum::Error>(Some((Bytes::new(), ws_receiver))),
            }
        });

    let input_stream = Box::pin(input_stream);

    let _handle = tokio::spawn(async move {
        match stt.transcribe(input_stream).await {
            Err(e) => tracing::error!("transcription error: {:?}", e),
            Ok(mut transcript_stream) => {
                while let Some(result) = transcript_stream.next().await {
                    match result {
                        Ok(data) => {
                            let out: ListenOutputChunk = data.into();
                            let msg = Message::Text(serde_json::to_string(&out).unwrap().into());

                            if let Err(e) = ws_sender.send(msg).await {
                                tracing::error!("websocket send error: {:?}", e);
                                break;
                            }
                        }
                        Err(e) => {
                            tracing::error!("transcription error: {:?}", e);
                            break;
                        }
                    }
                }
            }
        }

        tracing::info!("websocket_disconnected");
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
        axum::Router::new()
            .route("/api/desktop/transcribe", axum::routing::get(handler))
            .with_state(STTState {
                realtime_stt: hypr_stt::realtime::Client::builder()
                    .deepgram_api_key("".to_string())
                    .clova_api_key("".to_string())
                    .build(),
                recorded_stt: hypr_stt::recorded::Client::builder()
                    .deepgram_api_key("".to_string())
                    .clova_api_key("".to_string())
                    .build(),
            })
    }

    // https://github.com/tokio-rs/axum/blob/4f11b45/examples/testing-websockets/src/main.rs#L104
    #[tokio::test]
    async fn integration_test() {
        let listener = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)))
            .await
            .unwrap();
        let _addr = listener.local_addr().unwrap();
        tokio::spawn(axum::serve(listener, app()).into_future());
    }
}
