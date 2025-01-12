// https://github.com/tokio-rs/axum/blob/main/examples/websockets/src/client.rs
// https://github.com/snapview/tokio-tungstenite/blob/master/examples/client.rs

use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

use crate::{Client, TranscribeInputChunk, TranscribeOutputChunk};

impl Client {
    pub async fn transcribe(
        &self,
    ) -> Result<(
        Sender<TranscribeInputChunk>,
        Receiver<TranscribeOutputChunk>,
    )> {
        let req = self.transcribe_request.clone().into_client_request()?;
        let (ws_stream, _) = connect_async(req).await?;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        let (transcript_tx, transcript_rx) = mpsc::channel::<TranscribeOutputChunk>(32);
        let (audio_tx, mut audio_rx) = mpsc::channel::<TranscribeInputChunk>(32);

        let _send_task = tokio::spawn(async move {
            while let Some(audio) = audio_rx.recv().await {
                let msg = Message::Text(serde_json::to_string(&audio).unwrap().into());
                if let Err(_) = ws_sender.send(msg).await {
                    break;
                }
            }
        });

        let _recv_task = tokio::spawn(async move {
            while let Some(Ok(msg)) = ws_receiver.next().await {
                match msg {
                    Message::Text(data) => {
                        let out: TranscribeOutputChunk = serde_json::from_str(&data).unwrap();
                        transcript_tx.send(out).await.unwrap();
                    }
                    Message::Binary(_) => {}
                    Message::Close(_) => break,
                    Message::Ping(_) => {}
                    Message::Pong(_) => {}
                    Message::Frame(_) => {}
                }
            }
        });

        Ok((audio_tx, transcript_rx))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_channel::oneshot;
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::accept_async;

    async fn setup_test_server() -> (String, oneshot::Receiver<Vec<Message>>) {
        let (msg_tx, msg_rx) = oneshot::channel();
        let (ready_tx, ready_rx) = oneshot::channel();

        let listener = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)))
            .await
            .unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            ready_tx.send(()).unwrap();

            let (stream, _) = listener
                .accept()
                .await
                .expect("Failed to accept connection");
            let ws_stream = accept_async(stream)
                .await
                .expect("Failed to accept websocket");
            let (mut ws_sender, mut ws_receiver) = ws_stream.split();

            let mut messages = vec![];
            while let Some(Ok(msg)) = ws_receiver.next().await {
                // Echo the message back
                ws_sender.send(msg.clone()).await.unwrap();
                messages.push(msg);

                // Break if we receive a close message
                if matches!(msg, Message::Close(_)) {
                    break;
                }
            }

            msg_tx
                .send(messages)
                .expect("Failed to send collected messages");
        });

        ready_rx.await.expect("Server failed to start");
        (format!("ws://{}", addr), msg_rx)
    }

    #[tokio::test]
    async fn test_transcribe() {
        let (server_url, msg_rx) = setup_test_server().await;
        let client = Client::builder().with_base(&server_url).build().unwrap();

        // Get the client channels
        let (input_tx, mut output_rx) = client.transcribe().await.unwrap();

        // Send a test message
        let test_chunk = TranscribeInputChunk {
            // Fill with your test data
        };
        input_tx.send(test_chunk).await.unwrap();

        // Verify we receive the echoed message
        if let Some(response) = output_rx.recv().await {
            // Add your assertions here
        }

        // Clean up
        drop(input_tx);

        // Verify all messages received by the server
        let server_messages = msg_rx.await.expect("Failed to get server messages");
        assert!(!server_messages.is_empty());
    }
}
