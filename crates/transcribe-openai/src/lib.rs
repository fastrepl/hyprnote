use bytes::Bytes;

use tokio::sync::mpsc;
use tracing::{error, info};

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};

mod error;
pub use error::*;

#[derive(Debug, Clone)]
pub struct TranscribeConfig {}

impl Default for TranscribeConfig {
    fn default() -> Self {
        Self {}
    }
}

#[derive(Clone)]
pub struct TranscribeService {
    config: TranscribeConfig,
}

impl TranscribeService {
    pub async fn new(config: TranscribeConfig) -> Result<Self, Error> {
        Ok(Self { config })
    }

    pub async fn handle_websocket(self, ws: WebSocketUpgrade) -> impl IntoResponse {
        ws.on_upgrade(move |socket| self.handle_socket(socket))
    }

    async fn handle_socket(self, socket: WebSocket) {
        let (mut sender, mut receiver) = socket.split();
        let (audio_tx, audio_rx) = mpsc::channel::<Bytes>(100);
        let (result_tx, mut result_rx) = mpsc::channel::<()>(100);

        // Task to handle incoming audio data from WebSocket
        let audio_handler = tokio::spawn(async move {
            while let Some(Ok(Message::Binary(data))) = receiver.next().await {
                if audio_tx.send(Bytes::from(data)).await.is_err() {
                    break;
                }
            }
        });

        // Task to send transcription results back to WebSocket
        let result_sender = tokio::spawn(async move {
            while let Some(msg) = result_rx.recv().await {
                let json = match serde_json::to_string(&msg) {
                    Ok(json) => json,
                    Err(e) => {
                        error!("Failed to serialize message: {}", e);
                        continue;
                    }
                };

                if sender.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        });

        // Start transcription
        if let Err(e) = self.start_transcription(audio_rx, result_tx).await {
            error!("Transcription error: {}", e);
        }

        // Clean up tasks
        audio_handler.abort();
        result_sender.abort();
    }

    async fn start_transcription(
        &self,
        mut audio_rx: mpsc::Receiver<Bytes>,
        result_tx: mpsc::Sender<()>,
    ) -> Result<(), Error> {
        Ok(())
    }
}
