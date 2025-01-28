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

use hypr_bridge::{TranscribeInputChunk, TranscribeOutputChunk};
use hypr_stt::realtime::RealtimeSpeechToText;

use super::Params;
use crate::state::STTState;

pub async fn handler(
    Query(params): Query<Params>,
    ws: WebSocketUpgrade,
    State(state): State<STTState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state, params))
}

async fn websocket(socket: WebSocket, state: STTState, params: Params) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    let mut stt = state.realtime_stt.for_language(params.language).await;

    let (tx, rx_transcribe) = tokio::sync::broadcast::channel::<Bytes>(16);
    let rx_diarize = tx.subscribe();

    let ws_handler = tokio::spawn(async move {
        while let Some(Ok(Message::Text(data))) = ws_receiver.next().await {
            let input: TranscribeInputChunk = serde_json::from_str(&data).unwrap();
            let audio = Bytes::from(input.audio);

            if tx.send(audio).is_err() {
                break;
            }
        }
    });

    let transcribe_stream = Box::pin(futures_util::stream::try_unfold(
        rx_transcribe,
        |mut rx| async move {
            match rx.recv().await {
                Ok(audio) => Ok::<Option<(Bytes, _)>, std::io::Error>(Some((audio, rx))),
                Err(_) => Ok::<Option<(Bytes, _)>, std::io::Error>(None),
            }
        },
    ));

    let diarize_stream = Box::pin(futures_util::stream::try_unfold(
        rx_diarize,
        |mut rx| async move {
            match rx.recv().await {
                Ok(audio) => Ok::<Option<(Bytes, _)>, std::io::Error>(Some((audio, rx))),
                Err(_) => Ok::<Option<(Bytes, _)>, std::io::Error>(None),
            }
        },
    ));

    let task = async {
        let mut transcript_stream = stt.transcribe(transcribe_stream).await.unwrap();
        let mut diarization_stream =
            Box::pin(state.diarize.from_audio(diarize_stream).await.unwrap());

        loop {
            tokio::select! {
                result = transcript_stream.next() => {
                    if let Some(result) = result {
                        let output = TranscribeOutputChunk {
                            text: result.unwrap().text,
                        };
                        let msg = Message::Text(serde_json::to_string(&output).unwrap().into());
                        if ws_sender.send(msg).await.is_err() {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                result = diarization_stream.next() => {
                    if let Some(output) = result {
                        let msg = Message::Text(serde_json::to_string(&output).unwrap().into());
                        if ws_sender.send(msg).await.is_err() {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                else => break,
            }
        }
    };

    task.await;
    ws_handler.abort();
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
                realtime_stt: hypr_stt::realtime::Client::builder()
                    .deepgram_api_key("".to_string())
                    .clova_api_key("".to_string())
                    .build(),
                recorded_stt: hypr_stt::recorded::Client::builder()
                    .deepgram_api_key("".to_string())
                    .clova_api_key("".to_string())
                    .build(),
                diarize: hypr_bridge::diarize::DiarizeClient::builder()
                    .api_base("".to_string())
                    .api_key("".to_string())
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
            .api_base(format!("http://localhost:{}", addr.port()))
            .api_key("")
            .build()
            .unwrap();

        // let _ = client.transcribe().await.unwrap();
    }
}
