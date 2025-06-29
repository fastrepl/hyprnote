use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, Retryable};
use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

use std::sync::Arc;
use tokio::sync::Mutex;

use crate::Error;

pub trait WebSocketIO: Send + 'static {
    type Input: Send + Default;
    type Output: DeserializeOwned;

    fn to_input(data: bytes::Bytes) -> Self::Input;
    fn to_message(input: Self::Input) -> Message;
    fn from_message(msg: Message) -> Option<Self::Output>;
}

// WebSocket 연결 상태 enum
#[derive(Debug, Clone)]
enum WebSocketState {
    Connecting,
    Connected(
        Arc<
            Mutex<
                tokio_tungstenite::WebSocketStream<
                    tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
                >,
            >,
        >,
    ),
    Disconnecting,
    Disconnected,
    Failed(String),
}

// WebSocket 연결 관리 구조체
struct ManagedWebSocket {
    state: Arc<Mutex<WebSocketState>>,
}

impl ManagedWebSocket {
    async fn new(request: ClientRequestBuilder) -> Result<Self, crate::Error> {
        let state = Arc::new(Mutex::new(WebSocketState::Connecting));
        let ws = Self {
            state: state.clone(),
        };

        // 연결 시도
        match ws.connect_with_retry(request).await {
            Ok(stream) => {
                *state.lock().await = WebSocketState::Connected(Arc::new(Mutex::new(stream)));
                Ok(ws)
            }
            Err(e) => {
                *state.lock().await = WebSocketState::Failed(e.to_string());
                Err(e)
            }
        }
    }

    async fn connect_with_retry(
        &self,
        request: ClientRequestBuilder,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        crate::Error,
    > {
        let mut last_error = None;

        for attempt in 0..3 {
            if attempt > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(500 * attempt)).await;
            }

            match self.try_connect_once(request.clone()).await {
                Ok(stream) => return Ok(stream),
                Err(e) => {
                    tracing::warn!("Connection attempt {} failed: {:?}", attempt + 1, e);
                    last_error = Some(e);

                    // 실패한 연결 시도 후 리소스 정리를 위한 시간
                    #[cfg(target_os = "windows")]
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
            }
        }

        Err(last_error.unwrap_or_else(|| Error::Unknown))
    }

    async fn try_connect_once(
        &self,
        req: ClientRequestBuilder,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        crate::Error,
    > {
        let req = req.into_client_request()?;
        let (ws_stream, _) =
            tokio::time::timeout(std::time::Duration::from_secs(8), connect_async(req)).await??;

        Ok(ws_stream)
    }

    async fn close(&self) -> Result<(), crate::Error> {
        let stream = {
            let mut state = self.state.lock().await;
            match &*state {
                WebSocketState::Connected(stream) => {
                    let stream_clone = stream.clone();
                    *state = WebSocketState::Disconnecting;
                    Some(stream_clone)
                }
                _ => None,
            }
        };

        if let Some(stream) = stream {
            let mut stream = stream.lock().await;
            let _ = stream.close(None).await;
            *self.state.lock().await = WebSocketState::Disconnected;
        }

        Ok(())
    }
}

// Drop 구현으로 자동 정리
impl Drop for ManagedWebSocket {
    fn drop(&mut self) {
        let state = self.state.clone();
        tokio::spawn(async move {
            if let WebSocketState::Connected(_) = &*state.lock().await {
                // 비동기 정리 작업
                let ws = ManagedWebSocket {
                    state: state.clone(),
                };
                let _ = ws.close().await;
            }
        });
    }
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
        let managed_ws = ManagedWebSocket::new(self.request.clone()).await?;

        // 연결 상태 확인
        let stream = match &*managed_ws.state.lock().await {
            WebSocketState::Connected(stream) => stream.clone(),
            _ => return Err(crate::Error::Unknown),
        };

        // let (mut ws_sender, mut ws_receiver) = stream.lock().await.split();

        let output_stream = futures_util::stream::empty();

        Ok(output_stream)
    }
}
