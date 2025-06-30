use std::time::Duration;
use serde::de::DeserializeOwned;
use backon::{ConstantBuilder, Retryable};
use futures_util::{SinkExt, Stream, StreamExt};
use tokio::runtime::Handle;
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
        tracing::info!("📍실험: WebSocket 연결 전 시스템 상태");
        let metrics = Handle::current().metrics();
        let ws_stream = self.try_connect(self.request.to_owned()).await?;

        // 실험 B: 짧은 대기 후 확인
        tokio::time::sleep(Duration::from_millis(100)).await;
        tracing::info!("📍100ms 대기 후");

          // WebSocket을 정상적으로 종료
          let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
          // Close 프레임 전송
          if let Err(e) = ws_sender.close().await {
              tracing::warn!("📍ws_close_error: {:?}", e);
          }
          
          // receiver 스트림 소진
          while let Some(_) = ws_receiver.next().await {
              // 남은 메시지 소진
          }
          
          tracing::info!("📍WebSocket 정상 종료 완료");


        // let ws_stream = (|| self.try_connect(self.request.clone()))
        //     .retry(
        //         ConstantBuilder::default()
        //             .with_max_times(1) // 재시도 없음
        //             .with_delay(std::time::Duration::from_millis(100)),
        //     )
        //     .await?;
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
        tracing::info!("📍before into_client_request");
        let req = req.into_client_request()?;
        tracing::info!("📍connect_async: {:?}", req.uri());

        match connect_async(req).await {
            Ok((ws_stream, response)) => {
                tracing::info!("📍connect_async_success: {:?}", response.status());
                Ok(ws_stream)
            }
            Err(e) => {
                tracing::error!("📍connect_async_failed: {:?}", e);
                Err(e.into())
            }
        }

        // let (ws_stream, _) =
        //     tokio::time::timeout(std::time::Duration::from_secs(8), connect_async(req)).await??;

        // tracing::info!("📍after connect_async");

        // Ok(ws_stream)
    }
}
