pub mod diarize;
pub mod transcribe;

use bytes::BufMut;
use serde::{de::DeserializeOwned, Serialize};

use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, protocol::Message, ClientRequestBuilder},
};

use hypr_audio::AsyncSource;

pub trait WebSocketIO: Send + 'static {
    type Input: Serialize + Send;
    type Output: DeserializeOwned;

    fn create_input(audio_chunk: Vec<u8>) -> Self::Input;
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
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = T::Output>, crate::Error> {
        let req = self.request.clone().into_client_request().unwrap();
        let (ws_stream, _) = connect_async(req).await?;
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        let (done_tx, mut done_rx) = tokio::sync::oneshot::channel();

        let _send_task = tokio::spawn(async move {
            let mut audio_stream = audio_stream.resample(16 * 1000).chunks(1024).map(|chunk| {
                let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
                for sample in chunk {
                    let scaled = (sample * 32767.0).clamp(-32768.0, 32767.0);
                    buf.put_i16_le(scaled as i16);
                }
                buf.freeze()
            });

            while let Some(audio) = audio_stream.next().await {
                let input = T::create_input(audio.to_vec());
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
