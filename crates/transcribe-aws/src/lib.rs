use bytes::Bytes;
use std::sync::Arc;

use async_stream::stream;
use tokio::sync::mpsc;
use tracing::error;

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

use owhisper_interface::{ListenInputChunk, ListenOutputChunk, ListenParams, Word2};

mod error;
pub use error::*;

#[derive(Clone)]
pub struct TranscribeService {
    client: Arc<Client>,
}

impl TranscribeService {
    pub async fn new(config: owhisper_config::AwsModelConfig) -> Result<Self, crate::Error> {
        let region_provider = RegionProviderChain::first_try(Some(Region::new(config.region)))
            .or_default_provider()
            .or_else(Region::new("us-west-2"));

        let shared_config = aws_config::defaults(BehaviorVersion::v2025_01_17())
            .region(region_provider)
            .load()
            .await;
        let client = Client::new(&shared_config);

        Ok(Self {
            client: Arc::new(client),
        })
    }

    pub async fn handle_websocket(
        self,
        ws: WebSocketUpgrade,
        params: Option<ListenParams>,
    ) -> Response {
        ws.on_upgrade(move |socket| self.handle_socket(socket, params))
            .into_response()
    }

    async fn handle_socket(self, socket: WebSocket, params: Option<ListenParams>) {
        let (sender, mut receiver) = socket.split();

        let _params = params.unwrap_or_default();

        let (audio_tx, audio_rx) = mpsc::channel::<Bytes>(100);

        let audio_task = tokio::spawn(async move {
            while let Some(Ok(msg)) = receiver.next().await {
                match msg {
                    Message::Text(data) => {
                        // Parse the ListenInputChunk from JSON
                        if let Ok(chunk) = serde_json::from_str::<ListenInputChunk>(&data) {
                            match chunk {
                                ListenInputChunk::Audio { data } => {
                                    if !data.is_empty() {
                                        if audio_tx.send(Bytes::from(data)).await.is_err() {
                                            break;
                                        }
                                    }
                                }
                                ListenInputChunk::DualAudio { mic, speaker } => {
                                    // For now, mix the dual audio channels
                                    let mixed = mix_audio(mic, speaker);
                                    if !mixed.is_empty() {
                                        if audio_tx.send(Bytes::from(mixed)).await.is_err() {
                                            break;
                                        }
                                    }
                                }
                                ListenInputChunk::End => break,
                            }
                        }
                    }
                    Message::Close(_) => break,
                    _ => {}
                }
            }
        });

        // Start transcription
        if let Err(e) = self.start_transcription(audio_rx, sender).await {
            error!("Transcription error: {}", e);
        }

        audio_task.abort();
    }

    async fn start_transcription(
        &self,
        mut audio_rx: mpsc::Receiver<Bytes>,
        mut sender: futures_util::stream::SplitSink<WebSocket, Message>,
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
            .language_code(LanguageCode::EnUs) // TODO: make configurable
            .media_sample_rate_hertz(16000)
            .media_encoding(MediaEncoding::Pcm)
            .audio_stream(input_stream.into())
            .send()
            .await?;

        while let Some(event) = output.transcript_result_stream.recv().await? {
            match event {
                TranscriptResultStream::TranscriptEvent(transcript_event) => {
                    if let Some(transcript) = transcript_event.transcript {
                        for result in transcript.results.unwrap_or_default() {
                            // Skip partial results for now
                            if result.is_partial {
                                continue;
                            }

                            if let Some(alternatives) = result.alternatives {
                                if let Some(first) = alternatives.first() {
                                    if let Some(text) = &first.transcript {
                                        let mut words = Vec::new();

                                        // AWS doesn't provide word-level data in the same way
                                        // So we'll split the transcript into words
                                        for word_text in text.split_whitespace() {
                                            words.push(Word2 {
                                                text: word_text.to_string(),
                                                speaker: None,
                                                confidence: None,
                                                start_ms: Some((result.start_time * 1000.0) as u64),
                                                end_ms: Some((result.end_time * 1000.0) as u64),
                                            });
                                        }

                                        if !words.is_empty() {
                                            let output_chunk =
                                                ListenOutputChunk { meta: None, words };

                                            if let Ok(json) = serde_json::to_string(&output_chunk) {
                                                if sender
                                                    .send(Message::Text(json.into()))
                                                    .await
                                                    .is_err()
                                                {
                                                    break;
                                                }
                                            }
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

        let _ = sender.close().await;
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
            if req.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
                let (parts, body) = req.into_parts();
                let axum_req = axum::extract::Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => Ok(service.handle_websocket(ws, None).await),
                    Err(_) => Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body(Body::from("Invalid WebSocket upgrade request"))
                        .unwrap()),
                }
            } else {
                Ok(Response::builder()
                    .status(StatusCode::METHOD_NOT_ALLOWED)
                    .body(Body::from("Only WebSocket connections are supported"))
                    .unwrap())
            }
        })
    }
}

fn mix_audio(mic: Vec<u8>, speaker: Vec<u8>) -> Vec<u8> {
    // Mix the two audio channels by averaging them
    let len = mic.len().max(speaker.len());
    let mut mixed = Vec::with_capacity(len);

    for i in (0..len).step_by(2) {
        // Process 16-bit samples (2 bytes each)
        let mic_sample = if i + 1 < mic.len() {
            i16::from_le_bytes([mic[i], mic[i + 1]])
        } else {
            0
        };

        let speaker_sample = if i + 1 < speaker.len() {
            i16::from_le_bytes([speaker[i], speaker[i + 1]])
        } else {
            0
        };

        // Mix by averaging and prevent clipping
        let mixed_sample = ((mic_sample as i32 + speaker_sample as i32) / 2) as i16;
        let bytes = mixed_sample.to_le_bytes();
        mixed.push(bytes[0]);
        mixed.push(bytes[1]);
    }

    mixed
}
