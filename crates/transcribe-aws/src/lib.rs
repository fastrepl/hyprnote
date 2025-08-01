// AWS draft

use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use async_stream::stream;
use tokio::sync::mpsc;
use tracing::{error, info};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        FromRequest,
    },
    response::{IntoResponse, Response},
};
use futures_util::{SinkExt, StreamExt};
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};
use tower::Service;

use aws_config::{meta::region::RegionProviderChain, BehaviorVersion};
use aws_sdk_transcribestreaming::primitives::Blob;
use aws_sdk_transcribestreaming::types::{
    AudioEvent, AudioStream, LanguageCode, MediaEncoding, TranscriptResultStream,
};
use aws_sdk_transcribestreaming::{config::Region, Client};

mod error;
pub use error::*;

/// Configuration for the transcription service
#[derive(Debug, Clone)]
pub struct TranscribeConfig {
    pub region: Option<String>,
    pub language_code: LanguageCode,
    pub sample_rate: i32,
    pub encoding: MediaEncoding,
    pub chunk_size: usize,
}

impl Default for TranscribeConfig {
    fn default() -> Self {
        Self {
            region: None,
            language_code: LanguageCode::EnUs,
            sample_rate: 16000,
            encoding: MediaEncoding::Pcm,
            chunk_size: 8192,
        }
    }
}

/// Message types for WebSocket communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsMessage {
    AudioData { data: Vec<u8> },
    Transcript { text: String, is_partial: bool },
    Error { message: String },
    Complete,
}

#[derive(Clone)]
pub struct TranscribeService {
    client: Arc<Client>,
    config: TranscribeConfig,
}

impl TranscribeService {
    pub async fn new(config: TranscribeConfig) -> Result<Self, crate::Error> {
        let region_provider =
            RegionProviderChain::first_try(config.region.clone().map(Region::new))
                .or_default_provider()
                .or_else(Region::new("us-west-2"));

        let shared_config = aws_config::defaults(BehaviorVersion::v2025_01_17())
            .region(region_provider)
            .load()
            .await;
        let client = Client::new(&shared_config);

        Ok(Self {
            client: Arc::new(client),
            config,
        })
    }

    /// Handle WebSocket upgrade for streaming transcription
    async fn handle_websocket(self, ws: WebSocketUpgrade) -> Response {
        ws.on_upgrade(move |socket| self.handle_socket(socket))
            .into_response()
    }

    /// Handle WebSocket connection
    async fn handle_socket(self, socket: WebSocket) {
        let (mut sender, mut receiver) = socket.split();
        let (audio_tx, audio_rx) = mpsc::channel::<Bytes>(100);
        let (result_tx, mut result_rx) = mpsc::channel::<WsMessage>(100);

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

    /// Start AWS Transcribe streaming
    async fn start_transcription(
        &self,
        mut audio_rx: mpsc::Receiver<Bytes>,
        result_tx: mpsc::Sender<WsMessage>,
    ) -> Result<(), crate::Error> {
        // Create audio stream for AWS Transcribe
        let input_stream = stream! {
            while let Some(chunk) = audio_rx.recv().await {
                yield Ok(AudioStream::AudioEvent(
                    AudioEvent::builder()
                        .audio_chunk(Blob::new(chunk))
                        .build()
                ));
            }
        };

        // Start streaming transcription
        let mut output = self
            .client
            .start_stream_transcription()
            .language_code(self.config.language_code.clone())
            .media_sample_rate_hertz(self.config.sample_rate)
            .media_encoding(self.config.encoding.clone())
            .audio_stream(input_stream.into())
            .send()
            .await?;

        while let Some(event) = output.transcript_result_stream.recv().await? {
            match event {
                TranscriptResultStream::TranscriptEvent(transcript_event) => {
                    if let Some(transcript) = transcript_event.transcript {
                        for result in transcript.results.unwrap_or_default() {
                            if let Some(alternatives) = result.alternatives {
                                if let Some(first) = alternatives.first() {
                                    if let Some(text) = &first.transcript {
                                        let msg = WsMessage::Transcript {
                                            text: text.clone(),
                                            is_partial: result.is_partial,
                                        };

                                        if result_tx.send(msg).await.is_err() {
                                            info!("Client disconnected");
                                            return Ok(());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        // Send completion message
        let _ = result_tx.send(WsMessage::Complete).await;
        Ok(())
    }
}

impl Service<Request<Body>> for TranscribeService {
    type Response = Response;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let service = self.clone();

        Box::pin(async move {
            // Check if this is a WebSocket upgrade request
            if req.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
                // Create axum Request from http Request for WebSocketUpgrade extraction
                let (parts, body) = req.into_parts();
                let axum_req = axum::extract::Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => Ok(service.handle_websocket(ws).await),
                    Err(_) => {
                        let response = Response::builder()
                            .status(StatusCode::BAD_REQUEST)
                            .body(axum::body::Body::from("Invalid WebSocket upgrade request"))
                            .unwrap();
                        Ok(response)
                    }
                }
            } else {
                // Return method not allowed for non-WebSocket requests
                let response = Response::builder()
                    .status(StatusCode::METHOD_NOT_ALLOWED)
                    .body(axum::body::Body::from(
                        "Only WebSocket connections are supported",
                    ))
                    .unwrap();
                Ok(response)
            }
        })
    }
}
