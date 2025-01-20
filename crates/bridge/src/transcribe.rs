// https://github.com/tokio-rs/axum/blob/main/examples/websockets/src/client.rs
// https://github.com/snapview/tokio-tungstenite/blob/master/examples/client.rs

use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

use bytes::BufMut;
use kalosm_sound::AsyncSource;

use crate::{Client, TranscribeInputChunk, TranscribeOutputChunk};
impl Client {
    pub async fn transcribe(
        &self,
        audio_stream: impl Stream<Item = f32> + Send + Unpin + 'static + AsyncSource,
    ) -> Result<impl Stream<Item = TranscribeOutputChunk>, crate::Error> {
        let req = self
            .transcribe_request
            .clone()
            .into_client_request()
            .unwrap();
        let (ws_stream, _) = connect_async(req).await?;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        let _send_task = tokio::spawn(async move {
            let mut audio_stream = audio_stream.resample(16 * 1000).chunks(1024).map(|chunk| {
                let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
                for sample in chunk {
                    let scaled = (sample * 32767.0).clamp(-32768.0, 32767.0);
                    buf.put_i16_le(scaled as i16);
                }
                buf.freeze()
            });

            while let Some(audio) = audio_stream.next().await {
                let input = TranscribeInputChunk {
                    audio: audio.to_vec(),
                };
                let msg = Message::Text(serde_json::to_string(&input).unwrap().into());
                if let Err(_) = ws_sender.send(msg).await {
                    break;
                }
            }
        });

        let transcript_stream = async_stream::stream! {
            while let Some(Ok(msg)) = ws_receiver.next().await {
                match msg {
                    Message::Text(data) => {
                        let output: TranscribeOutputChunk = serde_json::from_str(&data).unwrap();
                        yield output;
                    }
                    Message::Binary(_) => {}
                    Message::Close(_) => break,
                    Message::Ping(_) => {}
                    Message::Pong(_) => {}
                    Message::Frame(_) => {}
                }
            }
        };

        Ok(transcript_stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_channel::oneshot;
    use futures_util::{SinkExt, StreamExt};
    use std::net::{Ipv4Addr, SocketAddr};
    use tokio_tungstenite::accept_async;

    async fn setup_test_server() -> String {
        let (ready_tx, ready_rx) = oneshot::channel();

        let listener = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)))
            .await
            .unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            ready_tx.send(()).unwrap();

            let (stream, _) = listener.accept().await.unwrap();
            let ws_stream = accept_async(stream).await.unwrap();
            let (mut ws_sender, mut ws_receiver) = ws_stream.split();

            while let Some(Ok(msg)) = ws_receiver.next().await {
                if matches!(msg, Message::Close(_)) {
                    break;
                }

                let text = msg.into_text().unwrap();
                let input: TranscribeInputChunk = serde_json::from_str(text.as_str()).unwrap();

                let size = input.audio.len();
                let non_zero_count = input.audio.iter().filter(|b| **b != 0.0).count();
                let text = format!("Received {} bytes, {} non-zero", size, non_zero_count);

                let output = serde_json::to_string(&TranscribeOutputChunk { text }).unwrap();
                ws_sender.send(Message::Text(output.into())).await.unwrap();
            }
        });

        ready_rx.await.unwrap();
        format!("ws://{}", addr)
    }

    // cargo test test_transcribe -p bridge -- --ignored --nocapture
    #[tokio::test]
    #[ignore]
    async fn test_transcribe() {
        let server_url = setup_test_server().await;
        let client = Client::builder()
            .with_base(&server_url)
            .with_token("test")
            .build()
            .unwrap();

        let mic = hypr_audio::MicInput::default();
        let audio_stream = mic.stream().unwrap();

        let transcript_stream = client.transcribe(audio_stream).await.unwrap();
        futures_util::pin_mut!(transcript_stream);

        while let Some(chunk) = transcript_stream.next().await {
            println!("{:?}", chunk);
        }
    }
}
