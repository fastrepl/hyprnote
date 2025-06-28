use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, ExponentialBuilder, Retryable};
use futures_util::{SinkExt, Stream, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async, tungstenite::client::IntoClientRequest, MaybeTlsStream, WebSocketStream,
};

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
        let ws_stream = (|| self.try_connect(self.request.clone()))
            .retry(
                ExponentialBuilder::default()
                    .with_min_delay(std::time::Duration::from_secs(1))
                    .with_max_delay(std::time::Duration::from_secs(30))
                    .with_max_times(5)
                    .with_factor(2.0), // 지수적 증가
            )
            .when(|e| {
                tracing::error!("ws_connect_failed: {:?}", e);
                !matches!(e, crate::Error::Connection(_)) // 연결 에러는 재시도 안함
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

        #[cfg(target_os = "windows")]
        let ws_stream = {
            let mut last_error = None;

            for attempt in 0..3 {
                if attempt > 0 {
                    // 이전 시도 정리를 위한 충분한 시간
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                }

                match tokio::time::timeout(
                    std::time::Duration::from_secs(8),
                    connect_async(req.clone()),
                )
                .await
                {
                    Ok(Ok((stream, _))) => return Ok(stream),
                    Ok(Err(e)) => {
                        tracing::error!("Connection attempt {} failed: {:?}", attempt + 1, e);
                        last_error = Some(e);
                    }
                    Err(_) => {
                        return Err(crate::Error::Connection(
                            tokio_tungstenite::tungstenite::Error::Io(std::io::Error::new(
                                std::io::ErrorKind::TimedOut,
                                "Connection attempt timed out",
                            )),
                        ))
                    }
                }
            }

            return Err(crate::Error::Connection(last_error.unwrap()));
        };

        #[cfg(not(target_os = "windows"))]
        let ws_stream =
            tokio::time::timeout(std::time::Duration::from_secs(8), connect_async(req)).await??;

        Ok(ws_stream)
    }

    async fn try_connect_with_cleanup(
        &self,
        req: ClientRequestBuilder,
    ) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>, crate::Error> {
        // Windows에서 명시적 리소스 정리
        #[cfg(target_os = "windows")]
        {
            // 이전 연결 흔적 정리
            tokio::task::yield_now().await;
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        let (ws_stream, _) = connect_async(req.into_client_request()?).await?;

        Ok(ws_stream)
    }
}
