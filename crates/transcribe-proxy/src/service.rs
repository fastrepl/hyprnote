use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::Duration;

use axum::body::Body;
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequest, Request};
use axum::http::{Response, StatusCode};
use axum::response::IntoResponse;
use futures_util::{
    SinkExt, StreamExt,
    stream::{SplitSink, SplitStream},
};
use tokio::sync::Mutex;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async, tungstenite::client::IntoClientRequest,
};
use tower::Service;

pub use tokio_tungstenite::tungstenite::ClientRequestBuilder;

const DEFAULT_CLOSE_CODE: u16 = 1011;
const UPSTREAM_CONNECT_TIMEOUT_MS: u64 = 5000;
const MAX_PENDING_QUEUE_BYTES: usize = 5 * 1024 * 1024; // 5 MiB

#[derive(Debug, Clone)]
struct QueuedPayload {
    data: Vec<u8>,
    is_text: bool,
    size: usize,
}

type ControlMessageMatcher = Arc<dyn Fn(&[u8]) -> bool + Send + Sync>;
type FirstMessageTransformer = Arc<dyn Fn(String) -> String + Send + Sync>;
type UpstreamSender = SplitSink<
    WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
    tokio_tungstenite::tungstenite::Message,
>;
type UpstreamReceiver = SplitStream<WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>>;
type ClientSender = SplitSink<WebSocket, Message>;
type ClientReceiver = SplitStream<WebSocket>;

pub struct WebSocketProxyBuilder {
    upstream_url: Option<String>,
    headers: HashMap<String, String>,
    control_message_matcher: Option<ControlMessageMatcher>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
}

impl Default for WebSocketProxyBuilder {
    fn default() -> Self {
        Self {
            upstream_url: None,
            headers: HashMap::new(),
            control_message_matcher: None,
            transform_first_message: None,
            connect_timeout: Duration::from_millis(UPSTREAM_CONNECT_TIMEOUT_MS),
        }
    }
}

impl WebSocketProxyBuilder {
    pub fn upstream_url(mut self, url: impl Into<String>) -> Self {
        self.upstream_url = Some(url.into());
        self
    }

    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(key.into(), value.into());
        self
    }

    pub fn headers(mut self, headers: HashMap<String, String>) -> Self {
        self.headers.extend(headers);
        self
    }

    pub fn upstream_request(
        self,
        request: ClientRequestBuilder,
    ) -> WebSocketProxyBuilderWithRequest {
        WebSocketProxyBuilderWithRequest {
            upstream_request: request,
            control_message_matcher: self.control_message_matcher,
            transform_first_message: self.transform_first_message,
            connect_timeout: self.connect_timeout,
        }
    }

    pub fn control_message_matcher<F>(mut self, matcher: F) -> Self
    where
        F: Fn(&[u8]) -> bool + Send + Sync + 'static,
    {
        self.control_message_matcher = Some(Arc::new(matcher));
        self
    }

    pub fn transform_first_message<F>(mut self, transformer: F) -> Self
    where
        F: Fn(String) -> String + Send + Sync + 'static,
    {
        self.transform_first_message = Some(Arc::new(transformer));
        self
    }

    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    pub fn build(self) -> WebSocketProxy {
        let url = self.upstream_url.expect("upstream_url is required");
        let mut request = ClientRequestBuilder::new(url.parse().expect("invalid upstream URL"));

        for (key, value) in self.headers {
            request = request.with_header(&key, &value);
        }

        WebSocketProxy {
            upstream_request: request,
            control_message_matcher: self.control_message_matcher,
            transform_first_message: self.transform_first_message,
            connect_timeout: self.connect_timeout,
        }
    }
}

pub struct WebSocketProxyBuilderWithRequest {
    upstream_request: ClientRequestBuilder,
    control_message_matcher: Option<ControlMessageMatcher>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
}

impl WebSocketProxyBuilderWithRequest {
    pub fn control_message_matcher<F>(mut self, matcher: F) -> Self
    where
        F: Fn(&[u8]) -> bool + Send + Sync + 'static,
    {
        self.control_message_matcher = Some(Arc::new(matcher));
        self
    }

    pub fn transform_first_message<F>(mut self, transformer: F) -> Self
    where
        F: Fn(String) -> String + Send + Sync + 'static,
    {
        self.transform_first_message = Some(Arc::new(transformer));
        self
    }

    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    pub fn build(self) -> WebSocketProxy {
        WebSocketProxy {
            upstream_request: self.upstream_request,
            control_message_matcher: self.control_message_matcher,
            transform_first_message: self.transform_first_message,
            connect_timeout: self.connect_timeout,
        }
    }
}

#[derive(Clone)]
pub struct WebSocketProxy {
    upstream_request: ClientRequestBuilder,
    control_message_matcher: Option<ControlMessageMatcher>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
}

impl WebSocketProxy {
    pub fn builder() -> WebSocketProxyBuilder {
        WebSocketProxyBuilder::default()
    }

    pub async fn handle(&self, client_socket: WebSocket) {
        let connection = WebSocketProxyConnection::new(
            self.upstream_request.clone(),
            self.control_message_matcher.clone(),
            self.transform_first_message.clone(),
            self.connect_timeout,
        );
        connection.run(client_socket).await;
    }

    pub async fn handle_upgrade(&self, ws: WebSocketUpgrade) -> Response<Body> {
        let proxy = self.clone();
        ws.on_upgrade(move |socket| async move {
            proxy.handle(socket).await;
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
            control_message_matcher: self.control_message_matcher.clone(),
            transform_first_message: self.transform_first_message.clone(),
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
    control_message_matcher: Option<ControlMessageMatcher>,
    transform_first_message: Option<FirstMessageTransformer>,
}

impl PreconnectedProxy {
    pub async fn handle(mut self, client_socket: WebSocket) {
        let upstream_stream = match self.upstream_stream.take() {
            Some(s) => s,
            None => {
                tracing::error!("preconnected_proxy_already_used");
                return;
            }
        };

        WebSocketProxyConnection::run_with_upstream(
            client_socket,
            upstream_stream,
            self.control_message_matcher,
            self.transform_first_message,
        )
        .await;
    }

    pub async fn handle_upgrade(self, ws: WebSocketUpgrade) -> Response<Body> {
        ws.on_upgrade(move |socket| async move {
            self.handle(socket).await;
        })
        .into_response()
    }
}

struct WebSocketProxyConnection {
    upstream_request: ClientRequestBuilder,
    control_message_matcher: Option<ControlMessageMatcher>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
}

impl WebSocketProxyConnection {
    fn new(
        upstream_request: ClientRequestBuilder,
        control_message_matcher: Option<ControlMessageMatcher>,
        transform_first_message: Option<FirstMessageTransformer>,
        connect_timeout: Duration,
    ) -> Self {
        Self {
            upstream_request,
            control_message_matcher,
            transform_first_message,
            connect_timeout,
        }
    }

    fn normalize_close_code(code: u16) -> u16 {
        if code == 1005 || code == 1006 || code == 1015 || code >= 5000 {
            DEFAULT_CLOSE_CODE
        } else {
            code
        }
    }

    fn get_payload_size(data: &[u8]) -> usize {
        data.len()
    }

    async fn run(self, client_socket: WebSocket) {
        let req = match self.upstream_request.into_client_request() {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("failed_to_build_upstream_request: {:?}", e);
                return;
            }
        };

        tracing::info!("connecting_to_upstream: {:?}", req.uri());

        let upstream_result = tokio::time::timeout(self.connect_timeout, connect_async(req)).await;

        let upstream_stream = match upstream_result {
            Ok(Ok((stream, _))) => stream,
            Ok(Err(e)) => {
                tracing::error!("upstream_connect_failed: {:?}", e);
                return;
            }
            Err(_) => {
                tracing::error!("upstream_connect_timeout");
                return;
            }
        };

        let (upstream_sender, upstream_receiver) = upstream_stream.split();
        let (client_sender, client_receiver) = client_socket.split();

        let pending_control_messages: Arc<Mutex<Vec<QueuedPayload>>> =
            Arc::new(Mutex::new(Vec::new()));
        let pending_data_messages: Arc<Mutex<Vec<QueuedPayload>>> =
            Arc::new(Mutex::new(Vec::new()));
        let pending_bytes: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));

        let (shutdown_tx, shutdown_rx) = tokio::sync::broadcast::channel::<(u16, String)>(1);
        let shutdown_rx2 = shutdown_tx.subscribe();

        let control_matcher = self.control_message_matcher.clone();
        let first_msg_transformer = self.transform_first_message.clone();

        let client_to_upstream = Self::run_client_to_upstream(
            client_receiver,
            upstream_sender,
            shutdown_tx.clone(),
            shutdown_rx,
            control_matcher,
            first_msg_transformer,
            pending_control_messages,
            pending_data_messages,
            pending_bytes,
        );

        let upstream_to_client = Self::run_upstream_to_client(
            upstream_receiver,
            client_sender,
            shutdown_tx.clone(),
            shutdown_rx2,
        );

        let _ = tokio::join!(client_to_upstream, upstream_to_client);
        tracing::info!("websocket_proxy_connection_closed");
    }

    async fn run_with_upstream(
        client_socket: WebSocket,
        upstream_stream: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
        control_message_matcher: Option<ControlMessageMatcher>,
        transform_first_message: Option<FirstMessageTransformer>,
    ) {
        let (upstream_sender, upstream_receiver) = upstream_stream.split();
        let (client_sender, client_receiver) = client_socket.split();

        let pending_control_messages: Arc<Mutex<Vec<QueuedPayload>>> =
            Arc::new(Mutex::new(Vec::new()));
        let pending_data_messages: Arc<Mutex<Vec<QueuedPayload>>> =
            Arc::new(Mutex::new(Vec::new()));
        let pending_bytes: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));

        let (shutdown_tx, shutdown_rx) = tokio::sync::broadcast::channel::<(u16, String)>(1);
        let shutdown_rx2 = shutdown_tx.subscribe();

        let client_to_upstream = Self::run_client_to_upstream(
            client_receiver,
            upstream_sender,
            shutdown_tx.clone(),
            shutdown_rx,
            control_message_matcher,
            transform_first_message,
            pending_control_messages,
            pending_data_messages,
            pending_bytes,
        );

        let upstream_to_client = Self::run_upstream_to_client(
            upstream_receiver,
            client_sender,
            shutdown_tx.clone(),
            shutdown_rx2,
        );

        let _ = tokio::join!(client_to_upstream, upstream_to_client);
        tracing::info!("websocket_proxy_connection_closed");
    }

    async fn run_client_to_upstream(
        mut client_receiver: ClientReceiver,
        mut upstream_sender: UpstreamSender,
        shutdown_tx: tokio::sync::broadcast::Sender<(u16, String)>,
        mut shutdown_rx: tokio::sync::broadcast::Receiver<(u16, String)>,
        control_matcher: Option<ControlMessageMatcher>,
        first_msg_transformer: Option<FirstMessageTransformer>,
        pending_control_messages: Arc<Mutex<Vec<QueuedPayload>>>,
        pending_data_messages: Arc<Mutex<Vec<QueuedPayload>>>,
        pending_bytes: Arc<Mutex<usize>>,
    ) {
        let mut has_transformed_first = first_msg_transformer.is_none();

        loop {
            tokio::select! {
                biased;

                result = shutdown_rx.recv() => {
                    if let Ok((code, reason)) = result {
                        let close_frame = tokio_tungstenite::tungstenite::protocol::CloseFrame {
                            code: tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode::from(code),
                            reason: reason.into(),
                        };
                        let _ = upstream_sender.send(tokio_tungstenite::tungstenite::Message::Close(Some(close_frame))).await;
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
                            let text = if !has_transformed_first {
                                has_transformed_first = true;
                                if let Some(ref transformer) = first_msg_transformer {
                                    transformer(text.to_string())
                                } else {
                                    text.to_string()
                                }
                            } else {
                                text.to_string()
                            };
                            let data = text.as_bytes().to_vec();
                            let size = Self::get_payload_size(&data);

                            if size > MAX_PENDING_QUEUE_BYTES {
                                tracing::warn!("payload_too_large: {}", size);
                                let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "payload_too_large".to_string()));
                                break;
                            }

                            let is_control = if let Some(ref matcher) = control_matcher {
                                matcher(&data)
                            } else {
                                false
                            };

                            let queued = QueuedPayload {
                                data: data.clone(),
                                is_text: true,
                                size,
                            };

                            {
                                let mut bytes = pending_bytes.lock().await;
                                if *bytes + size > MAX_PENDING_QUEUE_BYTES {
                                    tracing::warn!("backpressure_limit_exceeded: pending={}, new={}", *bytes, size);
                                    drop(bytes);
                                    let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "backpressure_limit".to_string()));
                                    break;
                                }
                                *bytes += size;
                            }

                            if is_control {
                                pending_control_messages.lock().await.push(queued);
                            } else {
                                pending_data_messages.lock().await.push(queued);
                            }

                            let mut to_send = Vec::new();
                            {
                                let mut control = pending_control_messages.lock().await;
                                let mut data_queue = pending_data_messages.lock().await;
                                let mut bytes = pending_bytes.lock().await;

                                while !control.is_empty() || !data_queue.is_empty() {
                                    let queued = if !control.is_empty() {
                                        control.remove(0)
                                    } else {
                                        data_queue.remove(0)
                                    };
                                    *bytes = bytes.saturating_sub(queued.size);
                                    to_send.push(queued);
                                }
                            }

                            let mut send_failed = false;
                            for queued in to_send {
                                let upstream_msg = if queued.is_text {
                                    tokio_tungstenite::tungstenite::Message::Text(
                                        String::from_utf8_lossy(&queued.data).to_string().into()
                                    )
                                } else {
                                    tokio_tungstenite::tungstenite::Message::Binary(queued.data.into())
                                };

                                if let Err(e) = upstream_sender.send(upstream_msg).await {
                                    tracing::error!("upstream_send_failed: {:?}", e);
                                    let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "upstream_send_failed".to_string()));
                                    send_failed = true;
                                    break;
                                }
                            }
                            if send_failed {
                                break;
                            }
                        }
                        Message::Binary(data) => {
                            let data = data.to_vec();
                            let size = Self::get_payload_size(&data);

                            if size > MAX_PENDING_QUEUE_BYTES {
                                tracing::warn!("payload_too_large: {}", size);
                                let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "payload_too_large".to_string()));
                                break;
                            }

                            let is_control = if let Some(ref matcher) = control_matcher {
                                matcher(&data)
                            } else {
                                false
                            };

                            let queued = QueuedPayload {
                                data: data.clone(),
                                is_text: false,
                                size,
                            };

                            {
                                let mut bytes = pending_bytes.lock().await;
                                if *bytes + size > MAX_PENDING_QUEUE_BYTES {
                                    tracing::warn!("backpressure_limit_exceeded: pending={}, new={}", *bytes, size);
                                    drop(bytes);
                                    let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "backpressure_limit".to_string()));
                                    break;
                                }
                                *bytes += size;
                            }

                            if is_control {
                                pending_control_messages.lock().await.push(queued);
                            } else {
                                pending_data_messages.lock().await.push(queued);
                            }

                            let mut to_send = Vec::new();
                            {
                                let mut control = pending_control_messages.lock().await;
                                let mut data_queue = pending_data_messages.lock().await;
                                let mut bytes = pending_bytes.lock().await;

                                while !control.is_empty() || !data_queue.is_empty() {
                                    let queued = if !control.is_empty() {
                                        control.remove(0)
                                    } else {
                                        data_queue.remove(0)
                                    };
                                    *bytes = bytes.saturating_sub(queued.size);
                                    to_send.push(queued);
                                }
                            }

                            let mut send_failed = false;
                            for queued in to_send {
                                let upstream_msg = if queued.is_text {
                                    tokio_tungstenite::tungstenite::Message::Text(
                                        String::from_utf8_lossy(&queued.data).to_string().into()
                                    )
                                } else {
                                    tokio_tungstenite::tungstenite::Message::Binary(queued.data.into())
                                };

                                if let Err(e) = upstream_sender.send(upstream_msg).await {
                                    tracing::error!("upstream_send_failed: {:?}", e);
                                    let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "upstream_send_failed".to_string()));
                                    send_failed = true;
                                    break;
                                }
                            }
                            if send_failed {
                                break;
                            }
                        }
                        Message::Ping(data) => {
                            let upstream_msg = tokio_tungstenite::tungstenite::Message::Ping(data.to_vec().into());
                            if let Err(e) = upstream_sender.send(upstream_msg).await {
                                tracing::error!("upstream_ping_failed: {:?}", e);
                            }
                        }
                        Message::Pong(data) => {
                            let upstream_msg = tokio_tungstenite::tungstenite::Message::Pong(data.to_vec().into());
                            if let Err(e) = upstream_sender.send(upstream_msg).await {
                                tracing::error!("upstream_pong_failed: {:?}", e);
                            }
                        }
                        Message::Close(frame) => {
                            let (code, reason) = if let Some(f) = frame {
                                (Self::normalize_close_code(f.code), f.reason.to_string())
                            } else {
                                (DEFAULT_CLOSE_CODE, "client_closed".to_string())
                            };
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
                        let close_frame = CloseFrame {
                            code,
                            reason: reason.into(),
                        };
                        let _ = client_sender.send(Message::Close(Some(close_frame))).await;
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
                        tokio_tungstenite::tungstenite::Message::Text(text) => {
                            if let Err(e) = client_sender.send(Message::Text(text.to_string().into())).await {
                                tracing::error!("client_send_failed: {:?}", e);
                                let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "client_send_failed".to_string()));
                                break;
                            }
                        }
                        tokio_tungstenite::tungstenite::Message::Binary(data) => {
                            if let Err(e) = client_sender.send(Message::Binary(data.to_vec().into())).await {
                                tracing::error!("client_send_failed: {:?}", e);
                                let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, "client_send_failed".to_string()));
                                break;
                            }
                        }
                        tokio_tungstenite::tungstenite::Message::Ping(data) => {
                            if let Err(e) = client_sender.send(Message::Ping(data.to_vec().into())).await {
                                tracing::error!("client_ping_failed: {:?}", e);
                            }
                        }
                        tokio_tungstenite::tungstenite::Message::Pong(data) => {
                            if let Err(e) = client_sender.send(Message::Pong(data.to_vec().into())).await {
                                tracing::error!("client_pong_failed: {:?}", e);
                            }
                        }
                        tokio_tungstenite::tungstenite::Message::Close(frame) => {
                            let (code, reason) = if let Some(f) = frame {
                                (Self::normalize_close_code(f.code.into()), f.reason.to_string())
                            } else {
                                (DEFAULT_CLOSE_CODE, "upstream_closed".to_string())
                            };
                            let _ = shutdown_tx.send((code, reason));
                            break;
                        }
                        tokio_tungstenite::tungstenite::Message::Frame(_) => {
                            // Raw frames are not forwarded
                        }
                    }
                }
            }
        }
    }
}
