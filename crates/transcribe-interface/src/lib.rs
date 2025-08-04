use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};

use axum::{
    body::Body,
    extract::ws::{WebSocket, WebSocketUpgrade},
    extract::{FromRequest, Request},
    http::{Method, Response, StatusCode},
    response::IntoResponse,
};
use tower::Service;

use bytes::Bytes;
use owhisper_interface::ListenParams;

pub use async_trait::async_trait;

#[async_trait]
pub trait TranscribeHandler: Clone + Send + Sync + 'static {
    type Error: std::error::Error + Send + Sync + 'static;

    async fn handle_socket(self, socket: WebSocket, params: Option<ListenParams>);
    async fn handle_batch_transcription(self, audio: Bytes) -> Result<Response<Body>, StatusCode>;
}

#[derive(Clone)]
pub struct BaseTranscribeService<T> {
    handler: T,
}

impl<T> BaseTranscribeService<T> {
    pub fn new(handler: T) -> Self {
        Self { handler }
    }
}

impl<T> Service<Request<Body>> for BaseTranscribeService<T>
where
    T: TranscribeHandler,
{
    type Response = Response<Body>;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let handler = self.handler.clone();

        Box::pin(async move {
            if req.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
                let uri = req.uri();
                let query_string = uri.query().unwrap_or("");
                let params: Option<ListenParams> = serde_qs::from_str(query_string).ok();

                let (parts, body) = req.into_parts();
                let axum_req = axum::extract::Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => {
                        let response = ws
                            .on_upgrade(move |socket| handler.handle_socket(socket, params))
                            .into_response();
                        Ok(response)
                    }
                    Err(_) => Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body(Body::from("invalid_websocket_upgrade_request"))
                        .unwrap()),
                }
            } else if req.method() == Method::POST {
                let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
                    Ok(bytes) => bytes,
                    Err(_) => {
                        return Ok(Response::builder()
                            .status(StatusCode::BAD_REQUEST)
                            .body(Body::from("failed_to_read_request_body"))
                            .unwrap())
                    }
                };

                match handler.handle_batch_transcription(body_bytes).await {
                    Ok(response) => Ok(response),
                    Err(status) => Ok(Response::builder()
                        .status(status)
                        .body(Body::from("batch_transcription_failed"))
                        .unwrap()),
                }
            } else {
                Ok(Response::builder()
                    .status(StatusCode::METHOD_NOT_ALLOWED)
                    .body(Body::from("only_websocket_and_post_requests_are_supported"))
                    .unwrap())
            }
        })
    }
}
