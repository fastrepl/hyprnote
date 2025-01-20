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

use crate::state::STTState;
use hypr_bridge::{TranscribeInputChunk, TranscribeOutputChunk};
use hypr_stt::realtime::RealtimeSpeechToText;

#[derive(Debug, serde::Deserialize)]
pub struct Params {
    language: codes_iso_639::part_1::LanguageCode,
}

pub async fn handler(
    Query(params): Query<Params>,
    ws: WebSocketUpgrade,
    State(state): State<STTState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state, params))
}

async fn websocket(socket: WebSocket, state: STTState, params: Params) {
    let (mut ws_sender, ws_receiver) = socket.split();

    let mut stt = state.stt.for_language(params.language).await;

    // TODO: Use async_stream::try_stream!
    let input_stream =
        futures_util::stream::try_unfold(ws_receiver, |mut ws_receiver| async move {
            match ws_receiver.next().await {
                Some(Ok(Message::Text(data))) => {
                    let input: TranscribeInputChunk = serde_json::from_str(&data).unwrap();
                    let audio = Bytes::from(input.audio);
                    Ok::<Option<(Bytes, _)>, axum::Error>(Some((audio, ws_receiver)))
                }
                _ => Ok::<Option<(Bytes, _)>, axum::Error>(Some((Bytes::new(), ws_receiver))),
            }
        });
    let input_stream = Box::pin(input_stream);

    let _handle = tokio::spawn(async move {
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
        axum::Router::new()
            .route("/api/native/transcribe", axum::routing::get(handler))
            .with_state(STTState {
                stt: hypr_stt::realtime::Client::builder()
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
        let addr = listener.local_addr().unwrap();
        tokio::spawn(axum::serve(listener, app()).into_future());

        let client = hypr_bridge::Client::builder()
            .with_base(format!("http://localhost:{}", addr.port()))
            .with_token("")
            .build()
            .unwrap();

        // let _ = client.transcribe().await.unwrap();
    }
}
