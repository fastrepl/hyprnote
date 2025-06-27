use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, Retryable};
use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

// Windows에서 스트림 drop 시 안전한 정리를 위한 wrapper
#[cfg(target_os = "windows")]
struct WindowsSafeStream<S> {
    inner: std::pin::Pin<Box<S>>,
    _cleanup_guard: WindowsCleanupGuard,
}

#[cfg(target_os = "windows")]
struct WindowsCleanupGuard;

#[cfg(target_os = "windows")]
impl Drop for WindowsCleanupGuard {
    fn drop(&mut self) {
        tracing::info!("📍 [WindowsCleanupGuard] Dropping - ensuring safe cleanup");
        // 동기적으로 약간의 지연을 추가하여 리소스 정리
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

#[cfg(target_os = "windows")]
impl<S: Stream> Stream for WindowsSafeStream<S> {
    type Item = S::Item;
    
    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        self.inner.as_mut().poll_next(cx)
    }
}

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
        tracing::info!("📍 [from_audio] Starting WebSocket connection process");
        
        // Windows에서 C runtime 에러 추적을 위한 추가 로깅
        #[cfg(target_os = "windows")]
        {
            tracing::info!("📍 [from_audio] Running on Windows - enhanced debugging enabled");
        }
        
        tracing::info!("📍 [from_audio] About to call try_connect with retry logic");
        
        // Windows에서는 재시도 횟수를 줄여 read.cpp 에러 방지
        #[cfg(target_os = "windows")]
        let retry_config = ConstantBuilder::default()
            .with_max_times(3)  // 20회에서 3회로 감소
            .with_delay(std::time::Duration::from_millis(1000)); // 500ms에서 1초로 증가
        
        #[cfg(not(target_os = "windows"))]
        let retry_config = ConstantBuilder::default()
            .with_max_times(20)
            .with_delay(std::time::Duration::from_millis(500));
        
        let ws_stream = (|| self.try_connect(self.request.clone()))
            .retry(retry_config)
            .when(|e| {
                tracing::error!("ws_connect_failed: {:?}", e);
                // Windows에서는 특정 에러에 대해 재시도하지 않음
                #[cfg(target_os = "windows")]
                {
                    if let crate::Error::Connection(ref tung_err) = e {
                        // IO 에러나 프로토콜 에러는 재시도하지 않음
                        match tung_err {
                            tokio_tungstenite::tungstenite::Error::Io(_) => {
                                tracing::error!("Windows: IO error detected, not retrying");
                                return false;
                            }
                            tokio_tungstenite::tungstenite::Error::Protocol(_) => {
                                tracing::error!("Windows: Protocol error detected, not retrying");
                                return false;
                            }
                            _ => {}
                        }
                    }
                }
                true
            })
            .sleep(tokio::time::sleep)
            .await?;

        tracing::info!("📍 [from_audio] WebSocket connection established successfully");
        tracing::info!("📍 [from_audio] About to split WebSocket stream");
        
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
        tracing::info!("📍 [from_audio] WebSocket stream split completed");
        tracing::info!("📍 [from_audio] Spawning send task");

        let _send_task = tokio::spawn(async move {
            tracing::info!("📍 [send_task] Starting audio send loop");
            let mut chunk_count = 0;
            
            while let Some(data) = audio_stream.next().await {
                chunk_count += 1;
                tracing::debug!("📍 [send_task] Processing audio chunk #{}, size: {} bytes", chunk_count, data.len());
                
                let input = T::to_input(data);
                let msg = T::to_message(input);

                if let Err(e) = ws_sender.send(msg).await {
                    tracing::error!("📍 [send_task] ws_send_failed at chunk #{}: {:?}", chunk_count, e);
                    break;
                }
                
                if chunk_count % 10 == 0 {
                    tracing::info!("📍 [send_task] Successfully sent {} audio chunks", chunk_count);
                }
            }

            tracing::info!("📍 [send_task] Audio stream ended, sending final message");
            
            // Windows에서 안전한 종료를 위해 close 전 지연
            #[cfg(target_os = "windows")]
            {
                tracing::info!("📍 [send_task] Windows - Pre-close delay");
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
            
            // We shouldn't send a 'Close' message, as it would prevent receiving remaining transcripts from the server.
            let _ = ws_sender.send(T::to_message(T::Input::default())).await;
            
            // Windows에서 close 메시지 전송
            #[cfg(target_os = "windows")]
            {
                tracing::info!("📍 [send_task] Windows - Sending close frame");
                let _ = ws_sender.close().await;
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
            
            tracing::info!("📍 [send_task] Send task completed");
        });

        tracing::info!("📍 [from_audio] Creating output stream");
        
        // Windows에서 async_stream! 매크로 대신 더 안전한 방식 사용
        #[cfg(target_os = "windows")]
        {
            use futures_util::stream;
            
            tracing::info!("📍 [from_audio] Using Windows-safe stream implementation");
            
            // 스트림을 필터링하고 변환하는 더 안전한 방법
            let output_stream = stream::unfold(ws_receiver, |mut ws_receiver| async move {
                loop {
                    match ws_receiver.next().await {
                        Some(Ok(msg)) => {
                            match msg {
                                Message::Text(_) | Message::Binary(_) => {
                                    if let Some(output) = T::from_message(msg) {
                                        return Some((output, ws_receiver));
                                    }
                                    // 파싱 실패시 다음 메시지로 계속
                                    continue;
                                }
                                Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => {
                                    // 컨트롤 메시지는 무시하고 계속
                                    continue;
                                }
                                Message::Close(_) => {
                                    tracing::info!("📍 [output_stream] Close message received");
                                    return None;
                                }
                            }
                        }
                        Some(Err(e)) => {
                            if !matches!(
                                e,
                                tokio_tungstenite::tungstenite::Error::Protocol(
                                    tokio_tungstenite::tungstenite::error::ProtocolError::ResetWithoutClosingHandshake
                                )
                            ) {
                                tracing::error!("📍 [output_stream] WebSocket error: {:?}", e);
                            }
                            return None;
                        }
                        None => {
                            tracing::info!("📍 [output_stream] Stream ended");
                            return None;
                        }
                    }
                }
            });
            
            tracing::info!("📍 [from_audio] Returning output stream (Windows safe mode)");
            
            // Windows에서 안전한 drop을 위해 wrapper로 감싸기
            let safe_stream = WindowsSafeStream {
                inner: Box::pin(output_stream),
                _cleanup_guard: WindowsCleanupGuard,
            };
            
            Ok(safe_stream)
        }
        
        // 다른 플랫폼에서는 기존 async_stream! 사용
        #[cfg(not(target_os = "windows"))]
        {
            let output_stream = async_stream::stream! {
                tracing::info!("📍 [output_stream] Starting receive loop");
                let mut msg_count = 0;
                
                while let Some(msg_result) = ws_receiver.next().await {
                    msg_count += 1;
                    tracing::debug!("📍 [output_stream] Received message #{}", msg_count);
                    
                    match msg_result {
                        Ok(msg) => {
                            match msg {
                                Message::Text(ref text) => {
                                    tracing::debug!("📍 [output_stream] Received text message, length: {}", text.len());
                                    if let Some(output) = T::from_message(msg) {
                                        yield output;
                                    }
                                },
                                Message::Binary(ref data) => {
                                    tracing::debug!("📍 [output_stream] Received binary message, length: {}", data.len());
                                    if let Some(output) = T::from_message(msg) {
                                        yield output;
                                    }
                                },
                                Message::Ping(_) => {
                                    tracing::debug!("📍 [output_stream] Received ping");
                                    continue;
                                },
                                Message::Pong(_) => {
                                    tracing::debug!("📍 [output_stream] Received pong");
                                    continue;
                                },
                                Message::Frame(_) => {
                                    tracing::debug!("📍 [output_stream] Received frame");
                                    continue;
                                },
                                Message::Close(_) => {
                                    tracing::info!("📍 [output_stream] Received close message");
                                    break;
                                },
                            }
                        }
                        Err(e) => {
                            if let tokio_tungstenite::tungstenite::Error::Protocol(tokio_tungstenite::tungstenite::error::ProtocolError::ResetWithoutClosingHandshake) = e {
                                tracing::debug!("📍 [output_stream] ws_receiver_failed (reset): {:?}", e);
                            } else {
                                tracing::error!("📍 [output_stream] ws_receiver_failed: {:?}", e);
                            }
                            break;
                        }
                    }
                }
                tracing::info!("📍 [output_stream] Receive loop ended after {} messages", msg_count);
            };

            tracing::info!("📍 [from_audio] Returning output stream");
            Ok(output_stream)
        }
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
        tracing::info!("📍 [try_connect] Starting connection attempt");
        
        let req = req.into_client_request().unwrap();
        let uri = req.uri().clone();
        
        tracing::info!("📍 [try_connect] connect_async to URI: {:?}", uri);
        
        // Windows에서 더 상세한 디버깅
        #[cfg(target_os = "windows")]
        {
            tracing::info!("📍 [try_connect] Windows - URI scheme: {:?}", uri.scheme_str());
            tracing::info!("📍 [try_connect] Windows - URI host: {:?}", uri.host());
            tracing::info!("📍 [try_connect] Windows - URI port: {:?}", uri.port());
        }
        
        tracing::info!("📍 [try_connect] About to call connect_async with 8 second timeout");
        
        // Windows에서 C runtime 에러 추적을 위해 더 세밀하게 분리
        #[cfg(target_os = "windows")]
        {
            // Windows에서 connect_async 전에 추가 안정화
            tracing::info!("📍 [try_connect] Windows - Pre-connection stabilization");
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            
            // 연결을 여러 단계로 나누어 진행
            let result = tokio::time::timeout(
                std::time::Duration::from_secs(10), // 타임아웃을 8초에서 10초로 증가
                async {
                    tracing::info!("📍 [try_connect] Inside timeout block - about to await connect_async");
                    
                    // Windows에서 추가 지연으로 안정성 향상
                    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                    
                    // connect_async를 한 번에 호출하지 않고 단계별로 처리
                    tracing::info!("📍 [try_connect] Creating connection future");
                    let connect_future = connect_async(req);
                    
                    tracing::info!("📍 [try_connect] Awaiting connection future");
                    let connect_result = connect_future.await;
                    
                    tracing::info!("📍 [try_connect] connect_async completed with result: {:?}", 
                                  connect_result.as_ref().map(|_| "Success").unwrap_or("Error"));
                    
                    connect_result
                }
            ).await;
            
            match result {
                Ok(Ok((ws_stream, response))) => {
                    tracing::info!("📍 [try_connect] WebSocket connection successful");
                    tracing::info!("📍 [try_connect] Response status: {:?}", response.status());
                    Ok(ws_stream)
                }
                Ok(Err(e)) => {
                    tracing::error!("📍 [try_connect] WebSocket connection error: {:?}", e);
                    Err(e.into())
                }
                Err(timeout_err) => {
                    tracing::error!("📍 [try_connect] Connection timeout after 10 seconds");
                    Err(timeout_err.into())
                }
            }
        }
        
        // 다른 플랫폼에서는 기존 로직 유지
        #[cfg(not(target_os = "windows"))]
        {
            let (ws_stream, _) = tokio::time::timeout(
                std::time::Duration::from_secs(8), 
                connect_future
            ).await??;
            
            tracing::info!("📍 [try_connect] Connection successful");
            Ok(ws_stream)
        }
    }
}
