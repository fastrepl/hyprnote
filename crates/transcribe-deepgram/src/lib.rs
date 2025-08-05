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

use owhisper_interface::ListenParams;

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
        params: Option<ListenParams>,
    ) -> Response<Body> {
        ws.on_upgrade(move |socket| self.handle_socket(socket, params))
            .into_response()
    }

    async fn handle_socket(self, socket: WebSocket, params: Option<ListenParams>) {
        let (mut sender, mut receiver) = socket.split();

        let _params = params.unwrap_or_default();

        let options_builder = Options::builder()
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
                    Message::Binary(data) => {
                        if audio_tx.send(Ok(data.into())).await.is_err() {
                            break;
                        }
                    }
                    Message::Close(_) => break,
                    _ => {}
                }
            }
        });

        let audio_stream = tokio_stream::wrappers::ReceiverStream::new(audio_rx);

        match self
            .deepgram
            .transcription()
            .stream_request_with_options(options)
            .stream(audio_stream)
            .await
        {
            Ok(mut deepgram_stream) => {
                while let Some(result) = deepgram_stream.next().await {
                    if let Ok(json) = serde_json::to_string(&result.unwrap()) {
                        if sender.send(Message::Text(json.into())).await.is_err() {
                            break;
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
