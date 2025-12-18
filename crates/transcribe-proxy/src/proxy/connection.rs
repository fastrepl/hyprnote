use std::time::{Duration, Instant};

use axum::extract::ws::{CloseFrame, Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async, tungstenite::client::IntoClientRequest,
};

pub use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::pending::{PendingState, QueuedPayload};
use super::types::{
    ClientReceiver, ClientSender, ControlMessageTypes, DEFAULT_CLOSE_CODE, FirstMessageTransformer,
    OnCloseCallback, UpstreamReceiver, UpstreamSender, is_control_message, normalize_close_code,
};

pub struct WebSocketProxyConnection {
    upstream_request: ClientRequestBuilder,
    control_message_types: Option<ControlMessageTypes>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
    on_close: Option<OnCloseCallback>,
}

impl WebSocketProxyConnection {
    pub fn new(
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

    pub async fn run(self, client_socket: WebSocket) -> Result<(), crate::ProxyError> {
        let req = self
            .upstream_request
            .into_client_request()
            .map_err(|e| crate::ProxyError::InvalidRequest(e.to_string()))?;

        tracing::info!("connecting_to_upstream: {:?}", req.uri());

        let upstream_result = tokio::time::timeout(self.connect_timeout, connect_async(req)).await;

        let upstream_stream = match upstream_result {
            Ok(Ok((stream, _))) => stream,
            Ok(Err(e)) => {
                return Err(crate::ProxyError::ConnectionFailed(e.to_string()));
            }
            Err(_) => {
                return Err(crate::ProxyError::ConnectionTimeout);
            }
        };

        Self::run_proxy_loop(
            client_socket,
            upstream_stream,
            self.control_message_types,
            self.transform_first_message,
            self.on_close,
        )
        .await;

        Ok(())
    }

    pub async fn run_with_upstream(
        client_socket: WebSocket,
        upstream_stream: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
        control_message_types: Option<ControlMessageTypes>,
        transform_first_message: Option<FirstMessageTransformer>,
        on_close: Option<OnCloseCallback>,
    ) {
        Self::run_proxy_loop(
            client_socket,
            upstream_stream,
            control_message_types,
            transform_first_message,
            on_close,
        )
        .await;
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
            on_close(start_time.elapsed());
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
        let queued = QueuedPayload {
            data,
            is_text,
            size,
        };

        if let Err(reason) = pending.enqueue(queued, is_control) {
            tracing::warn!("{}: size={}", reason, size);
            let _ = shutdown_tx.send((DEFAULT_CLOSE_CODE, reason.to_string()));
            return true;
        }

        if flush_to_upstream(pending, upstream_sender).await.is_err() {
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
        first_msg_transformer: Option<FirstMessageTransformer>,
    ) {
        let mut pending = PendingState::new();
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
                            let text_str = if !has_transformed_first {
                                has_transformed_first = true;
                                first_msg_transformer.as_ref().map_or_else(
                                    || text.to_string(),
                                    |t| t(text.to_string()),
                                )
                            } else {
                                text.to_string()
                            };
                            let data = text_str.into_bytes();

                            if Self::process_data_message(&mut pending, data, true, &control_types, &shutdown_tx, &mut upstream_sender).await {
                                break;
                            }
                        }
                        Message::Binary(bytes) => {
                            has_transformed_first = true;
                            let data = bytes.to_vec();

                            if Self::process_data_message(&mut pending, data, false, &control_types, &shutdown_tx, &mut upstream_sender).await {
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
                                (normalize_close_code(f.code), f.reason.to_string())
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
                                (normalize_close_code(f.code.into()), f.reason.to_string())
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

async fn flush_to_upstream(
    pending: &mut PendingState,
    upstream_sender: &mut UpstreamSender,
) -> Result<(), ()> {
    for queued in pending.drain() {
        let upstream_msg = if queued.is_text {
            tokio_tungstenite::tungstenite::Message::Text(
                String::from_utf8_lossy(&queued.data).to_string().into(),
            )
        } else {
            tokio_tungstenite::tungstenite::Message::Binary(queued.data.into())
        };
        if upstream_sender.send(upstream_msg).await.is_err() {
            return Err(());
        }
    }
    Ok(())
}
