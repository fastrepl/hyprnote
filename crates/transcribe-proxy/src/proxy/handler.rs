use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::{Duration, Instant};

use axum::body::Body;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequest, Request};
use axum::http::{Response, StatusCode};
use axum::response::IntoResponse;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::ClientRequestBuilder;
use tokio_tungstenite::tungstenite::Message as TungsteniteMessage;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async, tungstenite::client::IntoClientRequest,
};
use tower::Service;

use super::builder::WebSocketProxyBuilder;
use super::pending::{PendingState, QueuedPayload};
use super::types::{
    ClientReceiver, ClientSender, ControlMessageTypes, DEFAULT_CLOSE_CODE, FirstMessageTransformer,
    OnCloseCallback, UpstreamReceiver, UpstreamSender, convert, is_control_message,
};

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

    async fn connect_upstream(
        &self,
    ) -> Result<WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>, crate::PreconnectError>
    {
        let req = self
            .upstream_request
            .clone()
            .into_client_request()
            .map_err(|e| crate::PreconnectError::InvalidRequest(e.to_string()))?;

        tracing::info!("connecting_to_upstream: {:?}", req.uri());

        let upstream_result = tokio::time::timeout(self.connect_timeout, connect_async(req)).await;

        match upstream_result {
            Ok(Ok((stream, _))) => Ok(stream),
            Ok(Err(e)) => Err(crate::PreconnectError::ConnectionFailed(e.to_string())),
            Err(_) => Err(crate::PreconnectError::Timeout),
        }
    }

    pub async fn handle(&self, client_socket: WebSocket) -> Result<(), crate::ProxyError> {
        let upstream_stream = self.connect_upstream().await?;

        Self::run_proxy_loop(
            client_socket,
            upstream_stream,
            self.control_message_types.clone(),
            self.transform_first_message.clone(),
            self.on_close.clone(),
        )
        .await;

        Ok(())
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

    async fn run_proxy_loop(
        client_socket: WebSocket,
        upstream_stream: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
        control_message_types: Option<ControlMessageTypes>,
        transform_first_message: Option<FirstMessageTransformer>,
        on_close: Option<OnCloseCallback>,
    ) {
        let start_time = Instant::now();

        let (upstream_sender, upstream_receiver) = upstream_stream.split();
        let (client_sender, client_receiver) = client_socket.split();

        let (shutdown_tx, shutdown_rx) = tokio::sync::broadcast::channel::<(u16, String)>(1);
        let shutdown_rx2 = shutdown_tx.subscribe();

        let client_to_upstream = Self::run_client_to_upstream(
            client_receiver,
            upstream_sender,
            shutdown_tx.clone(),
            shutdown_rx,
            control_message_types,
            transform_first_message,
        );

        let upstream_to_client = Self::run_upstream_to_client(
            upstream_receiver,
            client_sender,
            shutdown_tx.clone(),
            shutdown_rx2,
        );

        let _ = tokio::join!(client_to_upstream, upstream_to_client);

        if let Some(on_close) = on_close {
            on_close(start_time.elapsed()).await;
        }

        tracing::info!("websocket_proxy_connection_closed");
    }

    async fn process_data_message(
        pending: &mut PendingState,
        data: Vec<u8>,
        is_text: bool,
        control_types: &Option<ControlMessageTypes>,
        shutdown_tx: &tokio::sync::broadcast::Sender<(u16, String)>,
        upstream_sender: &mut UpstreamSender,
    ) -> bool {
        let is_control = control_types
            .as_ref()
            .map_or(false, |types| is_control_message(&data, types));
        let size = data.len();
        let queued = QueuedPayload { data, is_text };

        if let Err(reason) = pending.enqueue(queued, is_control) {
            tracing::warn!("{}: size={}", reason, size);
            let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, reason.to_string()));
            return true;
        }

        if pending.flush_to(upstream_sender).await.is_err() {
            tracing::error!("upstream_send_failed");
            let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "upstream_send_failed".to_string()));
            return true;
        }

        false
    }

    async fn run_client_to_upstream(
        mut client_receiver: ClientReceiver,
        mut upstream_sender: UpstreamSender,
        shutdown_tx: tokio::sync::broadcast::Sender<(u16, String)>,
        mut shutdown_rx: tokio::sync::broadcast::Receiver<(u16, String)>,
        control_types: Option<ControlMessageTypes>,
        mut first_msg_transformer: Option<FirstMessageTransformer>,
    ) {
        let mut pending = PendingState::new();

        loop {
            tokio::select! {
                biased;

                result = shutdown_rx.recv() => {
                    if let Ok((code, reason)) = result {
                        let _ = upstream_sender.send(convert::to_tungstenite_close(code, reason)).await;
                    }
                    break;
                }

                msg_opt = client_receiver.next() => {
                    let Some(msg_result) = msg_opt else {
                        let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "client_disconnected".to_string()));
                        break;
                    };

                    let msg = match msg_result {
                        Ok(m) => m,
                        Err(e) => {
                            tracing::error!("client_receive_error: {:?}", e);
                            let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "client_error".to_string()));
                            break;
                        }
                    };

                    match msg {
                        Message::Text(text) => {
                            let text_owned = text.to_string();
                            let text_str = match first_msg_transformer.take() {
                                Some(t) => t(text_owned),
                                None => text_owned,
                            };
                            let data = text_str.into_bytes();

                            if Self::process_data_message(&mut pending, data, true, &control_types, &shutdown_tx, &mut upstream_sender).await {
                                break;
                            }
                        }
                        Message::Binary(bytes) => {
                            first_msg_transformer = None;
                            let data = bytes.to_vec();

                            if Self::process_data_message(&mut pending, data, false, &control_types, &shutdown_tx, &mut upstream_sender).await {
                                break;
                            }
                        }
                        Message::Ping(data) => {
                            if let Err(e) = upstream_sender.send(TungsteniteMessage::Ping(data.to_vec().into())).await {
                                tracing::error!("upstream_ping_failed: {:?}", e);
                            }
                        }
                        Message::Pong(data) => {
                            if let Err(e) = upstream_sender.send(TungsteniteMessage::Pong(data.to_vec().into())).await {
                                tracing::error!("upstream_pong_failed: {:?}", e);
                            }
                        }
                        Message::Close(frame) => {
                            let (code, reason) = convert::extract_axum_close(frame, "client_closed");
                            let _ = shutdown_tx.send((code, reason));
                            break;
                        }
                    }
                }
            }
        }
    }

    async fn run_upstream_to_client(
        mut upstream_receiver: UpstreamReceiver,
        mut client_sender: ClientSender,
        shutdown_tx: tokio::sync::broadcast::Sender<(u16, String)>,
        mut shutdown_rx: tokio::sync::broadcast::Receiver<(u16, String)>,
    ) {
        loop {
            tokio::select! {
                biased;

                result = shutdown_rx.recv() => {
                    if let Ok((code, reason)) = result {
                        let _ = client_sender.send(convert::to_axum_close(code, reason)).await;
                    }
                    break;
                }

                msg_opt = upstream_receiver.next() => {
                    let Some(msg_result) = msg_opt else {
                        let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "upstream_disconnected".to_string()));
                        break;
                    };

                    let msg = match msg_result {
                        Ok(m) => m,
                        Err(e) => {
                            tracing::error!("upstream_receive_error: {:?}", e);
                            let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "upstream_error".to_string()));
                            break;
                        }
                    };

                    match msg {
                        TungsteniteMessage::Text(text) => {
                            if client_sender.send(Message::Text(text.to_string().into())).await.is_err() {
                                let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "client_send_failed".to_string()));
                                break;
                            }
                        }
                        TungsteniteMessage::Binary(data) => {
                            if client_sender.send(Message::Binary(data.to_vec().into())).await.is_err() {
                                let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "client_send_failed".to_string()));
                                break;
                            }
                        }
                        TungsteniteMessage::Ping(data) => {
                            let _ = client_sender.send(Message::Ping(data.to_vec().into())).await;
                        }
                        TungsteniteMessage::Pong(data) => {
                            let _ = client_sender.send(Message::Pong(data.to_vec().into())).await;
                        }
                        TungsteniteMessage::Close(frame) => {
                            let (code, reason) = convert::extract_tungstenite_close(frame, "upstream_closed");
                            let _ = shutdown_tx.send((code, reason));
                            break;
                        }
                        TungsteniteMessage::Frame(_) => {}
                    }
                }
            }
        }
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
            let is_websocket_upgrade = req
                .headers()
                .get("upgrade")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.eq_ignore_ascii_case("websocket"))
                .unwrap_or(false);

            if is_websocket_upgrade {
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
