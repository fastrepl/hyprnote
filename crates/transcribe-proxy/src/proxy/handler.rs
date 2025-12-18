use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Duration;

use axum::body::Body;
use axum::extract::ws::{WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequest, Request};
use axum::http::{Response, StatusCode};
use axum::response::IntoResponse;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async, tungstenite::client::IntoClientRequest,
};
use tower::Service;

pub use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::builder::WebSocketProxyBuilder;
use super::connection::WebSocketProxyConnection;
use super::types::{ControlMessageTypes, FirstMessageTransformer, OnCloseCallback};

#[derive(Clone)]
pub struct WebSocketProxy {
    upstream_request: ClientRequestBuilder,
    control_message_types: Option<ControlMessageTypes>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
    on_close: Option<OnCloseCallback>,
}

impl WebSocketProxy {
    pub(crate) fn new(
        upstream_request: ClientRequestBuilder,
        control_message_types: Option<ControlMessageTypes>,
        transform_first_message: Option<FirstMessageTransformer>,
        connect_timeout: Duration,
        on_close: Option<OnCloseCallback>,
    ) -> Self {
        Self {
            upstream_request,
            control_message_types,
            transform_first_message,
            connect_timeout,
            on_close,
        }
    }

    pub fn builder() -> WebSocketProxyBuilder {
        WebSocketProxyBuilder::default()
    }

    pub async fn handle(&self, client_socket: WebSocket) -> Result<(), crate::ProxyError> {
        let connection = WebSocketProxyConnection::new(
            self.upstream_request.clone(),
            self.control_message_types.clone(),
            self.transform_first_message.clone(),
            self.connect_timeout,
            self.on_close.clone(),
        );
        connection.run(client_socket).await
    }

    pub async fn handle_upgrade(&self, ws: WebSocketUpgrade) -> Response<Body> {
        let proxy = self.clone();
        ws.on_upgrade(move |socket| async move {
            if let Err(e) = proxy.handle(socket).await {
                tracing::error!("proxy_error: {:?}", e);
            }
        })
        .into_response()
    }

    pub async fn preconnect(&self) -> Result<PreconnectedProxy, crate::PreconnectError> {
        let req = self
            .upstream_request
            .clone()
            .into_client_request()
            .map_err(|e| crate::PreconnectError::InvalidRequest(e.to_string()))?;

        tracing::info!("preconnecting_to_upstream: {:?}", req.uri());

        let upstream_result = tokio::time::timeout(self.connect_timeout, connect_async(req)).await;

        let upstream_stream = match upstream_result {
            Ok(Ok((stream, _))) => stream,
            Ok(Err(e)) => {
                return Err(crate::PreconnectError::ConnectionFailed(e.to_string()));
            }
            Err(_) => {
                return Err(crate::PreconnectError::Timeout);
            }
        };

        Ok(PreconnectedProxy {
            upstream_stream: Some(upstream_stream),
            control_message_types: self.control_message_types.clone(),
            transform_first_message: self.transform_first_message.clone(),
            on_close: self.on_close.clone(),
        })
    }
}

impl Service<Request<Body>> for WebSocketProxy {
    type Response = Response<Body>;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let proxy = self.clone();

        Box::pin(async move {
            if req.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
                let (parts, body) = req.into_parts();
                let axum_req = Request::from_parts(parts, body);

                match WebSocketUpgrade::from_request(axum_req, &()).await {
                    Ok(ws) => Ok(proxy.handle_upgrade(ws).await),
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

pub struct PreconnectedProxy {
    upstream_stream: Option<WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>>,
    control_message_types: Option<ControlMessageTypes>,
    transform_first_message: Option<FirstMessageTransformer>,
    on_close: Option<OnCloseCallback>,
}

impl PreconnectedProxy {
    pub async fn handle(mut self, client_socket: WebSocket) -> Result<(), crate::ProxyError> {
        let upstream_stream = self
            .upstream_stream
            .take()
            .ok_or(crate::ProxyError::AlreadyUsed)?;

        WebSocketProxyConnection::run_with_upstream(
            client_socket,
            upstream_stream,
            self.control_message_types,
            self.transform_first_message,
            self.on_close,
        )
        .await;

        Ok(())
    }

    pub async fn handle_upgrade(self, ws: WebSocketUpgrade) -> Response<Body> {
        ws.on_upgrade(move |socket| async move {
            if let Err(e) = self.handle(socket).await {
                tracing::error!("proxy_error: {:?}", e);
            }
        })
        .into_response()
    }
}
