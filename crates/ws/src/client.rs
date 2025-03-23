use serde::de::DeserializeOwned;

use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

pub trait WebSocketIO: Send + 'static {
    type Input: Send;
    type Output: DeserializeOwned;

    fn to_input(data: bytes::Bytes) -> Self::Input;
    fn to_message(input: Self::Input) -> Message;
    fn from_message(msg: Message) -> Option<Self::Output>;
}

pub struct WebSocketClient {
    request: ClientRequestBuilder,
}

impl WebSocketClient {
    pub fn new(request: ClientRequestBuilder) -> Self {
        Self { request }
    }

    pub async fn from_audio<T: WebSocketIO>(
        &self,
        mut audio_stream: impl Stream<Item = bytes::Bytes> + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = T::Output>, crate::Error> {
        let req = self.request.clone().into_client_request().unwrap();

        tracing::info!("connect_async: {:?}", req.uri());

        let (ws_stream, _) =
            tokio::time::timeout(std::time::Duration::from_secs(25), connect_async(req)).await??;

        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        let (done_tx, mut done_rx) = tokio::sync::oneshot::channel();
        let (send_complete_tx, send_complete_rx) = tokio::sync::oneshot::channel();
        let (activity_tx, mut activity_rx) = tokio::sync::mpsc::channel(1);

        let _send_task = tokio::spawn(async move {
            while let Some(data) = audio_stream.next().await {
                let input = T::to_input(data);
                let msg = T::to_message(input);

                if let Err(e) = ws_sender.send(msg).await {
                    tracing::error!("ws_send_failed: {:?}", e);
                    break;
                }
            }

            tracing::info!("audio_stream_done");

            let _ = ws_sender.send(Message::Close(None)).await;
            let _ = send_complete_tx.send(());
        });

        let _timeout_task = tokio::spawn(async move {
            let _ = send_complete_rx.await;

            let d = tokio::time::Duration::from_secs(5);
            loop {
                match tokio::time::timeout(d, activity_rx.recv()).await {
                    Ok(Some(_)) => continue,
                    Ok(None) | Err(_) => {
                        let _ = done_tx.send(());
                        break;
                    }
                }
            }
        });

        let output_stream = async_stream::stream! {
            loop {
                tokio::select! {
                    _ = &mut done_rx => break,
                    msg = ws_receiver.next() => {
                        match msg {
                            Some(Ok(msg)) => {
                                let _ = activity_tx.send(()).await;

                                match msg {
                                    Message::Text(_) | Message::Binary(_) => {
                                        if let Some(output) = T::from_message(msg) {
                                            yield output;
                                        }
                                    },
                                    Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => continue,
                                    Message::Close(_) => break,
                                }
                            },
                            _ => continue,
                        }
                    }
                }
            }
        };

        Ok(output_stream)
    }
}
