use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use futures_util::{future, SinkExt, Stream, StreamExt};
use tokio::sync::mpsc;

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};

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
    pub async fn new(config: owhisper_config::ServeDeepgramConfig) -> Result<Self, Error> {
        let deepgram = if let Some(base_url) = &config.base_url {
            Deepgram::with_base_url_and_api_key(base_url.as_str(), &config.api_key)?
        } else {
            Deepgram::new(&config.api_key)?
        };

        Ok(Self { deepgram })
    }

    pub async fn handle_websocket(self, ws: WebSocketUpgrade) -> impl IntoResponse {
        ws.on_upgrade(move |socket| self.handle_socket(socket))
    }

    async fn handle_socket(self, socket: WebSocket) {
        let (mut sender, mut receiver) = socket.split();
    }
}

impl tower::Service<WebSocketUpgrade> for TranscribeService {
    type Response = axum::response::Response;
    type Error = std::convert::Infallible;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(
        &mut self,
        _cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        std::task::Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: WebSocketUpgrade) -> Self::Future {
        let service = self.clone();
        Box::pin(async move { Ok(service.handle_websocket(req).await.into_response()) })
    }
}
