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
                let msg = Message::Binary(serde_json::to_vec(&audio).unwrap().into());
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
