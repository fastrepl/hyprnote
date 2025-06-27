use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, Retryable};
use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

pub trait WebSocketIO: Send + 'static {
    type Input: Send + Default;
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
        let ws_stream = (|| async {
            // Windows에서 이전 연결 정리를 위한 지연
            #[cfg(target_os = "windows")]
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;

            self.try_connect(self.request.clone()).await
        })
        .retry(
            ConstantBuilder::default()
                .with_max_times(5) // 20 → 5회로 감소
                .with_delay(std::time::Duration::from_secs(2)), // 500ms → 2초로 증가
        )
        .when(|e| {
            tracing::error!("ws_connect_failed: {:?}", e);

            // Windows에서 특정 에러는 재시도하지 않음
            #[cfg(target_os = "windows")]
            {
                if let crate::Error::Connection(ref err) = e {
                    // I/O 에러는 재시도 안함
                    if matches!(err, tokio_tungstenite::tungstenite::Error::Io(_)) {
                        return false;
                    }
                }
            }

            true
        })
        .sleep(tokio::time::sleep)
        .await?;

        // let (mut ws_sender, mut ws_receiver) = ws_stream.split();

        // let _send_task = tokio::spawn(async move {
        //     while let Some(data) = audio_stream.next().await {
        //         let input = T::to_input(data);
        //         let msg = T::to_message(input);

        //         if let Err(e) = ws_sender.send(msg).await {
        //             tracing::error!("ws_send_failed: {:?}", e);
        //             break;
        //         }
        //     }

        //     // We shouldn't send a 'Close' message, as it would prevent receiving remaining transcripts from the server.
        //     let _ = ws_sender.send(T::to_message(T::Input::default())).await;
        // });

        // let output_stream = async_stream::stream! {
        //     while let Some(msg_result) = ws_receiver.next().await {
        //         match msg_result {
        //             Ok(msg) => {
        //                 match msg {
        //                     Message::Text(_) | Message::Binary(_) => {
        //                     if let Some(output) = T::from_message(msg) {
        //                         yield output;
        //                     }
        //                 },
        //                 Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => continue,
        //                     Message::Close(_) => break,
        //                 }
        //             }
        //             Err(e) => {
        //                 if let tokio_tungstenite::tungstenite::Error::Protocol(tokio_tungstenite::tungstenite::error::ProtocolError::ResetWithoutClosingHandshake) = e {
        //                     tracing::debug!("ws_receiver_failed: {:?}", e);
        //                 } else {
        //                     tracing::error!("ws_receiver_failed: {:?}", e);
        //                 }
        //                 break;
        //             }
        //         }
        //     }
        // };

        // dummy stream
        let output_stream = futures_util::stream::empty();

        Ok(output_stream)
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
