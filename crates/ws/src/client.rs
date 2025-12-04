use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, Retryable};
use futures_util::{
    future::{pending, FutureExt},
    SinkExt, Stream, StreamExt,
};
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};

pub use crate::config::{ConnectionConfig, KeepAliveConfig, RetryConfig};
pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder, Utf8Bytes};

#[derive(Debug)]
enum ControlCommand {
    Finalize(Option<Message>),
}

#[derive(Clone)]
pub struct WebSocketHandle {
    control_tx: tokio::sync::mpsc::UnboundedSender<ControlCommand>,
}

impl WebSocketHandle {
    pub async fn finalize_with_text(&self, text: Utf8Bytes) {
        if self
            .control_tx
            .send(ControlCommand::Finalize(Some(Message::Text(text))))
            .is_err()
        {
            tracing::warn!("control channel closed, cannot send finalize command");
        }
    }
}

pub struct SendTask {
    handle: tokio::task::JoinHandle<Result<(), crate::Error>>,
}

impl SendTask {
    pub async fn wait(self) -> Result<(), crate::Error> {
        match self.handle.await {
            Ok(result) => result,
            Err(join_err) if join_err.is_panic() => {
                std::panic::resume_unwind(join_err.into_panic());
            }
            Err(join_err) => {
                tracing::error!("send task cancelled: {:?}", join_err);
                Err(crate::Error::UnexpectedClose)
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DecodeError {
    #[error("unsupported message type")]
    UnsupportedType,

    #[error("deserialization failed: {0}")]
    DeserializationError(#[from] serde_json::Error),
}

pub trait WebSocketIO: Send + 'static {
    type Data: Send;
    type Input: Send;
    type Output: DeserializeOwned;

    fn to_input(data: Self::Data) -> Self::Input;
    fn to_message(input: Self::Input) -> Message;
    fn decode(msg: Message) -> Result<Self::Output, DecodeError>;
}

pub struct WebSocketClient {
    request: ClientRequestBuilder,
    keep_alive: Option<KeepAliveConfig>,
    config: ConnectionConfig,
}

impl WebSocketClient {
    pub fn new(request: ClientRequestBuilder) -> Self {
        Self {
            request,
            keep_alive: None,
            config: ConnectionConfig::default(),
        }
    }

    pub fn with_config(mut self, config: ConnectionConfig) -> Self {
        self.config = config;
        self
    }

    pub fn with_keep_alive(mut self, config: KeepAliveConfig) -> Self {
        self.keep_alive = Some(config);
        self
    }

    pub fn with_keep_alive_message(
        mut self,
        interval: std::time::Duration,
        message: Message,
    ) -> Self {
        self.keep_alive = Some(KeepAliveConfig { interval, message });
        self
    }

    pub async fn from_audio<T: WebSocketIO>(
        &self,
        initial_message: Option<Message>,
        mut audio_stream: impl Stream<Item = T::Data> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = Result<T::Output, crate::Error>>,
            WebSocketHandle,
            SendTask,
        ),
        crate::Error,
    > {
        let keep_alive_config = self.keep_alive.clone();
        let close_grace_period = self.config.close_grace_period;
        let retry_config = self.config.retry_config.clone();
        let ws_stream = (|| self.try_connect(self.request.clone()))
            .retry(
                ConstantBuilder::default()
                    .with_max_times(retry_config.max_attempts)
                    .with_delay(retry_config.delay),
            )
            .when(|e| {
                tracing::error!("ws_connect_failed: {:?}", e);
                true
            })
            .sleep(tokio::time::sleep)
            .await?;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        let (control_tx, mut control_rx) = tokio::sync::mpsc::unbounded_channel();
        let (error_tx, mut error_rx) = tokio::sync::mpsc::unbounded_channel::<crate::Error>();
        let handle = WebSocketHandle { control_tx };

        let send_task = tokio::spawn(async move {
            if let Some(msg) = initial_message {
                if let Err(e) = ws_sender.send(msg).await {
                    tracing::error!("ws_initial_message_failed: {:?}", e);
                    if error_tx.send(e.into()).is_err() {
                        tracing::warn!("output stream already closed, cannot propagate error");
                    }
                    return Err(crate::Error::DataSend {
                        context: "initial message".to_string(),
                    });
                }
            }

            let mut last_outbound_at = tokio::time::Instant::now();
            loop {
                let mut keep_alive_fut = if let Some(cfg) = keep_alive_config.as_ref() {
                    tokio::time::sleep_until(last_outbound_at + cfg.interval).boxed()
                } else {
                    pending().boxed()
                };

                tokio::select! {
                    biased;

                    _ = keep_alive_fut.as_mut() => {
                        if let Some(cfg) = keep_alive_config.as_ref() {
                            if let Err(e) = ws_sender.send(cfg.message.clone()).await {
                                tracing::error!("ws_keepalive_failed: {:?}", e);
                                if error_tx.send(e.into()).is_err() {
                                    tracing::warn!("output stream already closed, cannot propagate keepalive error");
                                }
                                break;
                            }
                            last_outbound_at = tokio::time::Instant::now();
                        }
                    }
                    Some(data) = audio_stream.next() => {
                        let input = T::to_input(data);
                        let msg = T::to_message(input);

                        if let Err(e) = ws_sender.send(msg).await {
                            tracing::error!("ws_send_failed: {:?}", e);
                            if error_tx.send(e.into()).is_err() {
                                tracing::warn!("output stream already closed, cannot propagate send error");
                            }
                            break;
                        }
                        last_outbound_at = tokio::time::Instant::now();
                    }
                    Some(ControlCommand::Finalize(maybe_msg)) = control_rx.recv() => {
                        if let Some(msg) = maybe_msg {
                            if let Err(e) = ws_sender.send(msg).await {
                                tracing::error!("ws_finalize_failed: {:?}", e);
                                if error_tx.send(e.into()).is_err() {
                                    tracing::warn!("output stream already closed, cannot propagate finalize error");
                                }
                                break;
                            }
                            last_outbound_at = tokio::time::Instant::now();
                        }
                    }
                    else => break,
                }
            }

            tracing::debug!("draining remaining messages before close");
            tokio::time::sleep(close_grace_period).await;
            if let Err(e) = ws_sender.close().await {
                tracing::debug!("ws_close_failed: {:?}", e);
            }
            Ok(())
        });

        let send_task_handle = SendTask { handle: send_task };

        let output_stream = async_stream::stream! {
            loop {
                tokio::select! {
                    Some(msg_result) = ws_receiver.next() => {
                        match msg_result {
                            Ok(msg) => {
                                match msg {
                                    Message::Text(_) | Message::Binary(_) => {
                                        match T::decode(msg) {
                                            Ok(output) => yield Ok(output),
                                            Err(DecodeError::UnsupportedType) => {
                                                tracing::debug!("ws_message_unsupported_type");
                                            }
                                            Err(DecodeError::DeserializationError(e)) => {
                                                tracing::warn!("ws_message_parse_failed: {}", e);
                                            }
                                        }
                                    },
                                    Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => continue,
                                    Message::Close(_) => break,
                                }
                            }
                            Err(e) => {
                                if let tokio_tungstenite::tungstenite::Error::Protocol(tokio_tungstenite::tungstenite::error::ProtocolError::ResetWithoutClosingHandshake) = &e {
                                    tracing::debug!("ws_receiver_failed: {:?}", e);
                                } else {
                                    tracing::error!("ws_receiver_failed: {:?}", e);
                                    yield Err(e.into());
                                }
                                break;
                            }
                        }
                    }
                    Some(error) = error_rx.recv() => {
                        yield Err(error);
                        break;
                    }
                    else => break,
                }
            }
        };

        Ok((output_stream, handle, send_task_handle))
    }

    async fn try_connect(
        &self,
        req: ClientRequestBuilder,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        crate::Error,
    > {
        let req = req
            .into_client_request()
            .map_err(|e| crate::Error::InvalidRequest(e.to_string()))?;

        tracing::info!("connect_async: {:?}", req.uri());

        let timeout_duration = self.config.connect_timeout;
        let (ws_stream, _) = tokio::time::timeout(timeout_duration, connect_async(req))
            .await
            .map_err(|e| crate::Error::timeout(e, timeout_duration))?
            .map_err(crate::Error::Connection)?;

        Ok(ws_stream)
    }
}
