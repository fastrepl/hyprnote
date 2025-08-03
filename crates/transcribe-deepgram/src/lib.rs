use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use futures_util::{future, SinkExt, Stream, StreamExt};
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
        batch_response::Response as DeepgramResponse,
        options::{Encoding, Model, Options},
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

    pub async fn handle_websocket(self, ws: WebSocketUpgrade) -> Response<Body> {
        ws.on_upgrade(move |socket| self.handle_socket(socket))
            .into_response()
    }

    async fn handle_socket(self, socket: WebSocket) {
        let (mut sender, mut receiver) = socket.split();
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
                let (parts, body) = req.into_parts();
                let axum_req = axum::extract::Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => Ok(service.handle_websocket(ws).await),
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
