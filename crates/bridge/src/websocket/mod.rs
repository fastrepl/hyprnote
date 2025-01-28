pub mod diarize;
pub mod transcribe;

use serde::{de::DeserializeOwned, Serialize};

use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, protocol::Message, ClientRequestBuilder},
};

pub trait WebSocketIO: Send + 'static {
    type Input: Serialize + Send;
    type Output: DeserializeOwned;

    fn create_input(data: bytes::Bytes) -> Self::Input;
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
        let (ws_stream, _) = connect_async(req).await?;
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        let (done_tx, mut done_rx) = tokio::sync::oneshot::channel();

        let _send_task = tokio::spawn(async move {
            while let Some(data) = audio_stream.next().await {
                let input = T::create_input(data);
                let msg = Message::Text(serde_json::to_string(&input).unwrap().into());
                if ws_sender.send(msg).await.is_err() {
                    break;
                }
            }

            let _ = ws_sender.send(Message::Close(None)).await;
            let _ = done_tx.send(());
        });

        let output_stream = async_stream::stream! {
            loop {
                tokio::select! {
                    _ = &mut done_rx => break,
                    msg = ws_receiver.next() => {
                        match msg {
                            Some(Ok(msg)) => {
                                match msg {
                                    Message::Text(data) => yield serde_json::from_str::<T::Output>(&data).unwrap(),
                                    Message::Binary(_) => {},
                                    Message::Close(_) => break,
                                    Message::Ping(_) => {},
                                    Message::Pong(_) => {},
                                    Message::Frame(_) => {},
                                }
                            }
                            _ => break,
                        }
                    }
                }
            }
        };

        Ok(output_stream)
    }
}
