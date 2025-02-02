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
use tokio::sync::broadcast;

use hypr_bridge::{ListenInputChunk, ListenOutputChunk};
use hypr_db::user::TranscriptChunk;
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
    tracing::info!("websocket_connected");

    let (mut ws_sender, mut ws_receiver) = socket.split();

    let mut stt = state.realtime_stt.for_language(params.language).await;

    let (tx, rx_transcribe) = broadcast::channel::<Bytes>(1024);
    let rx_diarize = tx.subscribe();

    let ws_handler = tokio::spawn(async move {
        while let Some(Ok(Message::Text(data))) = ws_receiver.next().await {
            let input: ListenInputChunk = serde_json::from_str(&data).unwrap();
            let audio = Bytes::from(input.audio);

            if tx.send(audio).is_err() {
                break;
            }
        }

        tracing::info!("websocket_disconnected");
    });

    let audio_stream_for_transcribe = Box::pin(create_audio_stream(rx_transcribe));
    let audio_stream_for_diarize = Box::pin(create_audio_stream(rx_diarize));

    let mut transcript_stream = stt.transcribe(audio_stream_for_transcribe).await.unwrap();
    let mut diarization_stream = Box::pin(
        state
            .diarize
            .from_audio(audio_stream_for_diarize)
            .await
            .unwrap(),
    );

    let task = async {
        let mut last_activity = tokio::time::Instant::now();

        loop {
            tokio::select! {
                item = diarization_stream.next() => {
                    last_activity = tokio::time::Instant::now();

                    if let Some(result) = item {
                        let data = ListenOutputChunk::Diarize(result);
                        let msg = Message::Text(serde_json::to_string(&data).unwrap().into());
                        ws_sender.send(msg).await.unwrap();
                    }
                }

                item = transcript_stream.next() => {
                    match item {
                        Some(Ok(result)) => {
                            last_activity = tokio::time::Instant::now();

                            for word in result.words {
                                let data = ListenOutputChunk::Transcribe(TranscriptChunk{
                                    text: word.text,
                                    start: word.start,
                                    end: word.end,
                                });
                                let msg = Message::Text(serde_json::to_string(&data).unwrap().into());
                                ws_sender.send(msg).await.unwrap();
                            }
                        }
                        _ => continue,
                    }
                }

                _ = tokio::time::sleep(tokio::time::Duration::from_millis(500)) => {
                    if last_activity.elapsed() >= tokio::time::Duration::from_secs(15) {
                        break;
                    }
                }
            }
        }
    };

    task.await;
    ws_handler.abort();

    tracing::info!("websocket_disconnected");
}

fn create_audio_stream(
    rx: broadcast::Receiver<Bytes>,
) -> impl futures_util::Stream<Item = Result<Bytes, std::io::Error>> {
    futures_util::stream::try_unfold(rx, move |mut rx| async move {
        match rx.recv().await {
            Ok(audio) => Ok(Some((audio, rx))),
            Err(broadcast::error::RecvError::Closed) => Ok(None),
            Err(broadcast::error::RecvError::Lagged(n)) => {
                tracing::warn!("audio_stream is lagging by {}", n);
                Ok(Some((Bytes::new(), rx)))
            }
        }
    })
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
