use bytes::Bytes;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;

use axum::{
    body::Body,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::{FromRequest, Request},
    http::{Method, Response, StatusCode},
    response::IntoResponse,
};
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};
use tower::Service;

use deepgram::{
    common::{
        audio_source::AudioSource,
        options::{Encoding, Language, Model, Options},
        stream_response::StreamResponse,
    },
    Deepgram,
};

use owhisper_interface::Word;

mod error;
pub use error::*;

#[derive(Clone)]
pub struct TranscribeService {
    deepgram: Deepgram,
}

impl TranscribeService {
    pub async fn new(config: owhisper_config::DeepgramModelConfig) -> Result<Self, Error> {
        let api_key = config.api_key.unwrap_or_default();
        let base_url = config
            .base_url
            .unwrap_or("https://api.deepgram.com/v1".to_string())
            .parse::<url::Url>()
            .unwrap();

        let deepgram = Deepgram::with_base_url_and_api_key(base_url, api_key)?;
        Ok(Self { deepgram })
    }

    pub async fn handle_websocket(
        self,
        ws: WebSocketUpgrade,
        params: Option<owhisper_interface::ListenParams>,
    ) -> Response<Body> {
        ws.on_upgrade(move |socket| self.handle_socket(socket, params))
            .into_response()
    }

    async fn handle_socket(
        self,
        socket: WebSocket,
        params: Option<owhisper_interface::ListenParams>,
    ) {
        let (mut sender, mut receiver) = socket.split();

        let params = params.unwrap_or_default();

        let mut options_builder = Options::builder()
            .model(Model::Nova2)
            .punctuate(true)
            .smart_format(true)
            .language(Language::en)
            .encoding(Encoding::Linear16);

        let options = options_builder.build();

        let (audio_tx, audio_rx) = mpsc::channel::<Result<bytes::Bytes, std::io::Error>>(100);

        let audio_task = tokio::spawn(async move {
            while let Some(Ok(msg)) = receiver.next().await {
                match msg {
                    Message::Text(text) => {
                        // Handle text messages (e.g., ListenInputChunk)
                        match serde_json::from_str::<owhisper_interface::ListenInputChunk>(&text) {
                            Ok(owhisper_interface::ListenInputChunk::Audio { data }) => {
                                if !data.is_empty() {
                                    let _ = audio_tx.send(Ok(bytes::Bytes::from(data))).await;
                                }
                            }
                            Ok(owhisper_interface::ListenInputChunk::DualAudio { data }) => {
                                if !data.is_empty() {
                                    // For dual audio, we'll just pass it through
                                    // Deepgram will handle it if we set channels(2)
                                    let _ = audio_tx.send(Ok(bytes::Bytes::from(data))).await;
                                }
                            }
                            Ok(owhisper_interface::ListenInputChunk::End) => {
                                break;
                            }
                            _ => {}
                        }
                    }
                    Message::Binary(data) => {
                        // Handle binary audio data directly
                        let _ = audio_tx.send(Ok(bytes::Bytes::from(data))).await;
                    }
                    Message::Close(_) => {
                        break;
                    }
                    _ => {}
                }
            }
        });

        // Create audio stream from channel
        let audio_stream = tokio_stream::wrappers::ReceiverStream::new(audio_rx);

        // Start Deepgram streaming transcription
        match self
            .deepgram
            .transcription()
            .stream_request_with_options(options)
            .stream(audio_stream)
            .await
        {
            Ok(mut deepgram_stream) => {
                // Process transcription results
                while let Some(result) = deepgram_stream.next().await {
                    match result {
                        Ok(StreamResponse::TranscriptResponse { channel, .. }) => {
                            if let Some(alternative) = channel.alternatives.first() {
                                if !alternative.transcript.is_empty() {
                                    // Convert Deepgram response to ListenOutputChunk
                                    let words: Vec<owhisper_interface::Word> = alternative
                                        .words
                                        .iter()
                                        .map(|w| owhisper_interface::Word {
                                            text: w
                                                .punctuated_word
                                                .as_ref()
                                                .unwrap_or(&w.word)
                                                .trim()
                                                .to_string(),
                                            speaker: w.speaker.map(|s| {
                                                owhisper_interface::SpeakerIdentity::Unassigned {
                                                    index: s as u8,
                                                }
                                            }),
                                            start_ms: Some((w.start * 1000.0) as u64),
                                            end_ms: Some((w.end * 1000.0) as u64),
                                            confidence: Some(w.confidence as f32),
                                        })
                                        .collect();

                                    let output =
                                        owhisper_interface::ListenOutputChunk { words, meta: None };

                                    // Send transcription result back through WebSocket
                                    if let Ok(json) = serde_json::to_string(&output) {
                                        if sender.send(Message::Text(json.into())).await.is_err() {
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        Ok(StreamResponse::TerminalResponse { .. }) => {
                            break;
                        }
                        Err(e) => {
                            tracing::error!("Deepgram error: {:?}", e);
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to start Deepgram stream: {:?}", e);
            }
        }

        // Clean up
        audio_task.abort();
        let _ = sender.close().await;
    }

    async fn handle_batch_transcription(
        self,
        audio_data: Bytes,
    ) -> Result<Response<Body>, StatusCode> {
        let audio_source = AudioSource::from_buffer(audio_data.to_vec());

        let options = Options::builder()
            .model(Model::Nova2)
            .punctuate(true)
            .build();

        match self
            .deepgram
            .transcription()
            .prerecorded(audio_source, &options)
            .await
        {
            Ok(response) => {
                let json_response = serde_json::to_string(&response)
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "application/json")
                    .body(Body::from(json_response))
                    .unwrap())
            }
            Err(e) => {
                eprintln!("Deepgram transcription error: {:?}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

impl Service<Request<Body>> for TranscribeService {
    type Response = Response<Body>;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let service = self.clone();

        Box::pin(async move {
            if req.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
                let uri = req.uri();
                let query_string = uri.query().unwrap_or("");
                let params: Option<owhisper_interface::ListenParams> =
                    serde_qs::from_str(query_string).ok();

                let (parts, body) = req.into_parts();
                let axum_req = axum::extract::Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => Ok(service.handle_websocket(ws, params).await),
                    Err(_) => Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body(Body::from("Invalid WebSocket upgrade request"))
                        .unwrap()),
                }
            } else if req.method() == Method::POST {
                let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
                    Ok(bytes) => bytes,
                    Err(_) => {
                        return Ok(Response::builder()
                            .status(StatusCode::BAD_REQUEST)
                            .body(Body::from("Failed to read request body"))
                            .unwrap())
                    }
                };

                match service.handle_batch_transcription(body_bytes).await {
                    Ok(response) => Ok(response),
                    Err(status) => Ok(Response::builder()
                        .status(status)
                        .body(Body::from("Transcription failed"))
                        .unwrap()),
                }
            } else {
                Ok(Response::builder()
                    .status(StatusCode::METHOD_NOT_ALLOWED)
                    .body(Body::from("Only WebSocket and POST requests are supported"))
                    .unwrap())
            }
        })
    }
}
