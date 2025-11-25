use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, Retryable};
use futures_util::{
    future::{pending, FutureExt},
    SinkExt, Stream, StreamExt,
};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, Utf8Bytes},
};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

#[derive(Debug)]
enum ControlCommand {
    Finalize(Option<Message>),
}

#[derive(Clone)]
struct KeepAliveConfig {
    interval: std::time::Duration,
    message: Message,
}

#[derive(Clone)]
pub struct WebSocketHandle {
    control_tx: tokio::sync::mpsc::UnboundedSender<ControlCommand>,
}

impl WebSocketHandle {
    pub async fn finalize_with_text(&self, text: Utf8Bytes) {
        let _ = self
            .control_tx
            .send(ControlCommand::Finalize(Some(Message::Text(text))));
    }
}

pub trait WebSocketIO: Send + 'static {
    type Data: Send;
    type Input: Send;
    type Output: DeserializeOwned;

    fn to_input(data: Self::Data) -> Self::Input;
    fn to_message(input: Self::Input) -> Message;
    fn from_message(msg: Message) -> Option<Self::Output>;
}

pub struct WebSocketClient {
    request: ClientRequestBuilder,
    keep_alive: Option<KeepAliveConfig>,
}

impl WebSocketClient {
    pub fn new(request: ClientRequestBuilder) -> Self {
        Self {
            request,
            keep_alive: None,
        }
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
        mut audio_stream: impl Stream<Item = T::Data> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = Result<T::Output, crate::Error>>,
            WebSocketHandle,
        ),
        crate::Error,
    > {
        let keep_alive_config = self.keep_alive.clone();
        let ws_stream = (|| self.try_connect(self.request.clone()))
            .retry(
                ConstantBuilder::default()
                    .with_max_times(5)
                    .with_delay(std::time::Duration::from_millis(500)),
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

        let _send_task = tokio::spawn(async move {
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
                                let _ = error_tx.send(e.into());
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
                            let _ = error_tx.send(e.into());
                            break;
                        }
                        last_outbound_at = tokio::time::Instant::now();
                    }
                    Some(cmd) = control_rx.recv() => {
                        match cmd {
                            ControlCommand::Finalize(maybe_msg) => {
                                if let Some(msg) = maybe_msg {
                                    if let Err(e) = ws_sender.send(msg).await {
                                        tracing::error!("ws_finalize_failed: {:?}", e);
                                        let _ = error_tx.send(e.into());
                                        break;
                                    }
                                    last_outbound_at = tokio::time::Instant::now();
                                }
                            }
                        }
                    }
                    else => break,
                }
            }

            // Wait 5 seconds before closing the connection
            // TODO: This might not be enough to ensure receiving remaining transcripts from the server.
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            let _ = ws_sender.close().await;
        });

        let output_stream = async_stream::stream! {
            loop {
                tokio::select! {
                    Some(msg_result) = ws_receiver.next() => {
                        match msg_result {
                            Ok(msg) => {
                                let is_text = matches!(msg, Message::Text(_));
                                let is_binary = matches!(msg, Message::Binary(_));
                                let text_preview = if let Message::Text(ref t) = msg {
                                    Some(t.to_string())
                                } else {
                                    None
                                };

                                match msg {
                                    Message::Text(_) | Message::Binary(_) => {
                                        if let Some(output) = T::from_message(msg) {
                                            yield Ok(output);
                                        } else if is_text {
                                            if let Some(text) = text_preview {
                                                tracing::warn!("ws_message_parse_failed: {}", text);
                                            }
                                        } else if is_binary {
                                            tracing::warn!("ws_binary_message_parse_failed");
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

        Ok((output_stream, handle))
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
        let req = req.into_client_request().unwrap();

        tracing::info!("connect_async: {:?}", req.uri());

        let (ws_stream, _) =
            tokio::time::timeout(std::time::Duration::from_secs(8), connect_async(req)).await??;

        Ok(ws_stream)
    }
}
