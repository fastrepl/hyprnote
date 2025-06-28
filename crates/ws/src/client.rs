use futures_util::{SinkExt, Stream, StreamExt};
use serde::de::DeserializeOwned;
use std::pin::Pin;
use std::sync::Mutex;
use std::task::{Context, Poll};
use tokio::net::TcpStream;
use tokio::pin;
use tokio_tungstenite::{
    connect_async, tungstenite::client::IntoClientRequest, MaybeTlsStream, WebSocketStream,
};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

type WSStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub trait WebSocketIO: Send + 'static {
    type Input: Send + Default;
    type Output: DeserializeOwned;

    fn to_input(data: bytes::Bytes) -> Self::Input;
    fn to_message(input: Self::Input) -> Message;
    fn from_message(msg: Message) -> Option<Self::Output>;
}

// WebSocket 출력 스트림 - async_stream 대신 직접 구현
pub struct WebSocketOutputStream<T: WebSocketIO> {
    ws_stream: WSStream,
    audio_rx: tokio::sync::mpsc::UnboundedReceiver<bytes::Bytes>,
    state: StreamState,
    _phantom: std::marker::PhantomData<T>,
}

impl<T: WebSocketIO> Unpin for WebSocketOutputStream<T> {}

enum StreamState {
    Active,
    Closing,
    Closed,
}

impl<T: WebSocketIO> Stream for WebSocketOutputStream<T> {
    type Item = T::Output;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        match self.state {
            StreamState::Closed => return Poll::Ready(None),
            _ => {}
        }

        // 오디오 데이터 송신 처리
        match &self.audio_rx.poll_recv(cx) {
            Poll::Ready(Some(data)) => {
                let input = T::to_input(data.clone());
                let msg = T::to_message(input);

                // 동기적으로 전송 시도
                let mut ws = Pin::new(&mut self.ws_stream);
                match ws.poll_ready_unpin(cx) {
                    Poll::Ready(Ok(())) => {
                        if let Err(e) = ws.start_send_unpin(msg) {
                            tracing::error!("ws_send_failed: {:?}", e);
                            self.state = StreamState::Closed;
                            return Poll::Ready(None);
                        }
                        // 즉시 flush
                        let _ = ws.poll_flush_unpin(cx);
                    }
                    Poll::Ready(Err(e)) => {
                        tracing::error!("ws_not_ready: {:?}", e);
                        self.state = StreamState::Closed;
                        return Poll::Ready(None);
                    }
                    Poll::Pending => {}
                }
            }
            Poll::Ready(None) => {
                self.state = StreamState::Closing;
            }
            Poll::Pending => {}
        }

        // WebSocket 메시지 수신
        let mut ws = Pin::new(&mut self.ws_stream);
        match ws.poll_next_unpin(cx) {
            Poll::Ready(Some(Ok(msg))) => {
                match msg {
                    Message::Text(_) | Message::Binary(_) => {
                        if let Some(output) = T::from_message(msg) {
                            return Poll::Ready(Some(output));
                        }
                    }
                    Message::Close(_) => {
                        tracing::info!("WebSocket closed by server");
                        self.state = StreamState::Closed;
                        return Poll::Ready(None);
                    }
                    _ => {}
                }
                // 다시 폴링하도록 wake
                cx.waker().wake_by_ref();
                Poll::Pending
            }
            Poll::Ready(Some(Err(e))) => {
                tracing::error!("ws_receiver_failed: {:?}", e);
                self.state = StreamState::Closed;
                Poll::Ready(None)
            }
            Poll::Ready(None) => {
                self.state = StreamState::Closed;
                Poll::Ready(None)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

// 마지막 연결 시간 추적
static LAST_CONNECTION_TIME: once_cell::sync::Lazy<Mutex<Option<std::time::Instant>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(None));

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
        // Windows CRT 에러 방지를 위한 연결 간격 보장
        let wait_time = {
            let mut last_time = LAST_CONNECTION_TIME.lock().unwrap();
            let wait = if let Some(last) = *last_time {
                let elapsed = last.elapsed();
                if elapsed < std::time::Duration::from_secs(2) {
                    Some(std::time::Duration::from_secs(2) - elapsed)
                } else {
                    None
                }
            } else {
                None
            };
            *last_time = Some(std::time::Instant::now());
            wait
        }; // mutex guard dropped here

        if let Some(wait_time) = wait_time {
            tracing::info!(
                "Waiting {:?} before new connection to prevent Windows CRT error",
                wait_time
            );
            tokio::time::sleep(wait_time).await;
        }

        // 새 연결 생성
        let ws_stream = self.create_new_connection().await?;

        // MPSC 채널로 분리 대신 처리
        let (audio_tx, audio_rx) = tokio::sync::mpsc::unbounded_channel::<bytes::Bytes>();

        // 오디오 스트림을 채널로 전송
        tokio::spawn(async move {
            while let Some(data) = audio_stream.next().await {
                if audio_tx.send(data).is_err() {
                    break;
                }
            }
        });

        // 커스텀 스트림 반환
        Ok(WebSocketOutputStream {
            ws_stream,
            audio_rx,
            state: StreamState::Active,
            _phantom: std::marker::PhantomData::<T>,
        })
    }

    async fn create_new_connection(&self) -> Result<WSStream, crate::Error> {
        let req = self.request.clone().into_client_request().unwrap();
        tracing::info!("Connecting to: {:?}", req.uri());

        #[cfg(target_os = "windows")]
        {
            // Windows에서 안정성을 위한 추가 지연
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }

        let (ws_stream, _) =
            tokio::time::timeout(std::time::Duration::from_secs(10), connect_async(req))
                .await
                .map_err(|_| {
                    crate::Error::Connection(tokio_tungstenite::tungstenite::Error::Io(
                        std::io::Error::new(std::io::ErrorKind::TimedOut, "Connection timeout"),
                    ))
                })??;

        tracing::info!("WebSocket connection established successfully");
        Ok(ws_stream)
    }
}
