use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;

use axum::{
    body::Body,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::{FromRequest, Request},
    http::{Response, StatusCode},
    response::IntoResponse,
};
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};
use tower::Service;

use deepgram::{
    common::options::{Encoding, Language, Model, Options},
    Deepgram,
};

use owhisper_interface::{ListenInputChunk, ListenOutputChunk, ListenParams, Word2};

#[derive(Clone)]
pub struct TranscribeService {
    deepgram: Deepgram,
}

impl TranscribeService {
    pub async fn new(config: owhisper_config::DeepgramModelConfig) -> Result<Self, crate::Error> {
        let api_key = config.api_key.unwrap_or_default();

        let base_url = config
            .base_url
            .unwrap_or("https://api.deepgram.com".to_string())
            .parse::<url::Url>()
            .unwrap();

        let deepgram = Deepgram::with_base_url_and_api_key(base_url, api_key)?;
        Ok(Self { deepgram })
    }

    pub async fn handle_websocket(
        self,
        ws: WebSocketUpgrade,
        params: Option<ListenParams>,
    ) -> Response<Body> {
        ws.on_upgrade(move |socket| self.handle_socket(socket, params))
            .into_response()
    }

    async fn handle_socket(self, socket: WebSocket, params: Option<ListenParams>) {
        let (mut sender, mut receiver) = socket.split();

        let _params = params.unwrap_or_default();

        let (audio_tx, audio_rx) = mpsc::channel::<Result<bytes::Bytes, std::io::Error>>(100);

        let audio_task = tokio::spawn(async move {
            while let Some(Ok(msg)) = receiver.next().await {
                match msg {
                    Message::Text(data) => {
                        if let Ok(chunk) = serde_json::from_str::<ListenInputChunk>(&data) {
                            match chunk {
                                ListenInputChunk::Audio { data } => {
                                    if !data.is_empty() {
                                        if audio_tx.send(Ok(data.into())).await.is_err() {
                                            break;
                                        }
                                    }
                                }
                                ListenInputChunk::DualAudio { mic, speaker } => {
                                    let mixed = mix_audio(mic, speaker);
                                    if !mixed.is_empty() {
                                        if audio_tx.send(Ok(mixed.into())).await.is_err() {
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

        let audio_stream = tokio_stream::wrappers::ReceiverStream::new(audio_rx);

        let options = Options::builder()
            .model(Model::Nova2)
            .punctuate(true)
            .smart_format(true)
            .language(Language::en)
            .encoding(Encoding::Linear16)
            .build();

        match self
            .deepgram
            .transcription()
            .stream_request_with_options(options)
            .keep_alive()
            .sample_rate(16000)
            .channels(1)
            .stream(audio_stream)
            .await
        {
            Ok(mut deepgram_stream) => {
                while let Some(result) = deepgram_stream.next().await {
                    if let Ok(response) = result {
                        match response {
                            deepgram::common::stream_response::StreamResponse::TranscriptResponse {
                                channel,
                                ..
                            } => {
                                if let Some(first_alt) = channel.alternatives.first() {
                                    let mut words = Vec::new();

                                    if !first_alt.words.is_empty() {
                                        for word in &first_alt.words {
                                            words.push(Word2 {
                                                text: word.word.clone(),
                                                speaker: None,
                                                confidence: Some(word.confidence as f32),
                                                start_ms: Some((word.start * 1000.0) as u64),
                                                end_ms: Some((word.end * 1000.0) as u64),
                                            });
                                        }
                                    } else if !first_alt.transcript.is_empty() {
                                        for text in first_alt.transcript.split_whitespace() {
                                            words.push(Word2 {
                                                text: text.to_string(),
                                                speaker: None,
                                                confidence: Some(first_alt.confidence as f32),
                                                start_ms: None,
                                                end_ms: None,
                                            });
                                        }
                                    }

                                    if !words.is_empty() {
                                        let output_chunk = ListenOutputChunk { meta: None, words };

                                        if let Ok(json) = serde_json::to_string(&output_chunk) {
                                            if sender.send(Message::Text(json.into())).await.is_err() {
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to start Deepgram stream: {:?}", e);
            }
        }

        audio_task.abort();
        let _ = sender.close().await;
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
    let len = mic.len().max(speaker.len());
    let mut mixed = Vec::with_capacity(len);

    for i in (0..len).step_by(2) {
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

        let mixed_sample = ((mic_sample as i32 + speaker_sample as i32) / 2) as i16;
        let bytes = mixed_sample.to_le_bytes();
        mixed.push(bytes[0]);
        mixed.push(bytes[1]);
    }

    mixed
}
