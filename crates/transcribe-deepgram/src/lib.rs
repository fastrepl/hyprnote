use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use futures_util::{future, SinkExt, Stream, StreamExt};
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
    common::{
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
        let deepgram = Deepgram::with_base_url_and_api_key(
            config.base_url.parse::<url::Url>().unwrap(),
            config.api_key.unwrap_or_default(),
        )?;

        Ok(Self { deepgram })
    }

    pub async fn handle_websocket(self, ws: WebSocketUpgrade) -> Response<Body> {
        ws.on_upgrade(move |socket| self.handle_socket(socket))
            .into_response()
    }

    async fn handle_socket(self, socket: WebSocket) {
        let (mut sender, mut receiver) = socket.split();
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
            // Check for WebSocket upgrade header
            if req.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
                let (parts, body) = req.into_parts();
                let axum_req = axum::extract::Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => Ok(service.handle_websocket(ws).await),
                    Err(_) => {
                        let response = Response::builder()
                            .status(StatusCode::BAD_REQUEST)
                            .body(Body::from("Invalid WebSocket upgrade request"))
                            .unwrap();
                        Ok(response)
                    }
                }
            } else {
                // Handle non-WebSocket requests
                let response = Response::builder()
                    .status(StatusCode::METHOD_NOT_ALLOWED)
                    .body(Body::from("Only WebSocket connections are supported"))
                    .unwrap();
                Ok(response)
            }
        })
    }
}
