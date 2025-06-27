use serde::de::DeserializeOwned;

use backon::{ConstantBuilder, Retryable};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, stream::unfold};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::{
    connect_async, connect_async_with_config, tungstenite::protocol::WebSocketConfig, MaybeTlsStream,
    WebSocketStream,
};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub use tokio_tungstenite::tungstenite::{protocol::Message, ClientRequestBuilder};

use std::sync::{Arc, Mutex};

// Windows에서 스트림 drop 시 안전한 정리를 위한 wrapper
#[cfg(target_os = "windows")]
struct WindowsSafeStream<S> {
    inner: std::pin::Pin<Box<S>>,
    send_task: Option<tokio::task::JoinHandle<()>>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

#[cfg(target_os = "windows")]
impl<S> Drop for WindowsSafeStream<S> {
    fn drop(&mut self) {
        tracing::info!("📍 [WindowsSafeStream] Dropping - starting graceful shutdown");
        tracing::info!("📍❓ [CHECK-DROP-1] Beginning of drop");
        
        // 1. shutdown 신호 전송
        if let Some(tx) = self.shutdown_tx.take() {
            tracing::info!("📍 [WindowsSafeStream] Sending shutdown signal");
            let _ = tx.send(());
            tracing::info!("📍❓ [CHECK-DROP-2] After shutdown signal");
            std::thread::sleep(std::time::Duration::from_millis(50));
            tracing::info!("📍✅ [CHECK-DROP-2] No error after wait");
        }
        
        // 2. send_task 종료 대기
        if let Some(task) = self.send_task.take() {
            tracing::info!("📍 [WindowsSafeStream] Waiting for send task");
            
            // block_on을 사용하지 않고 동기적으로 대기
            let start = std::time::Instant::now();
            while !task.is_finished() && start.elapsed() < std::time::Duration::from_millis(300) {
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            
            if !task.is_finished() {
                tracing::warn!("📍 [WindowsSafeStream] Force aborting send task");
                task.abort();
            }
            
            tracing::info!("📍❓ [CHECK-DROP-3] After task handling");
            std::thread::sleep(std::time::Duration::from_millis(50));
            tracing::info!("📍✅ [CHECK-DROP-3] No error after wait");
        }
        
        // 3. inner stream을 명시적으로 drop
        tracing::info!("📍❓ [CHECK-DROP-4] About to drop inner stream");
        // inner는 이미 Pin<Box<S>>이므로 직접 처리할 수 없음
        // 대신 전체 struct가 drop될 때 자동으로 drop됨
        tracing::info!("📍❓ [CHECK-DROP-5] Inner stream will be dropped automatically");
        std::thread::sleep(std::time::Duration::from_millis(50));
        tracing::info!("📍✅ [CHECK-DROP-5] No error after wait");
        
        // 4. 모든 비동기 작업이 정리될 시간 제공
        std::thread::sleep(std::time::Duration::from_millis(200));
        
        tracing::info!("📍 [WindowsSafeStream] Graceful shutdown completed");
        tracing::info!("📍❓ [CHECK-DROP-6] End of drop function");
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
        println!("===== WS::CLIENT::FROM_AUDIO CALLED =====");
        tracing::info!("📍 [from_audio] Starting WebSocket connection process");
        tracing::info!("📍 Module path: {}", module_path!());
        tracing::info!("📍 Current log target: {}", std::any::type_name::<Self>());
        
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
        
        // Windows에서 각 단계별로 체크
        #[cfg(target_os = "windows")]
        {
            tracing::info!("📍❓ [CHECK-1] Before split - checking if read.cpp error occurs here");
            std::thread::sleep(std::time::Duration::from_millis(100));
            tracing::info!("📍✅ [CHECK-1] No error after wait");
        }
        
        tracing::info!("📍 [from_audio] About to split WebSocket stream");
        
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
        #[cfg(target_os = "windows")]
        {
            tracing::info!("📍❓ [CHECK-2] After split - checking if read.cpp error occurs here");
            std::thread::sleep(std::time::Duration::from_millis(100));
            tracing::info!("📍✅ [CHECK-2] No error after wait");
        }
        
        tracing::info!("📍 [from_audio] WebSocket stream split completed");
        tracing::info!("📍 [from_audio] Spawning send task");

        // Windows에서 graceful shutdown을 위한 채널
        #[cfg(target_os = "windows")]
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        
        #[cfg(not(target_os = "windows"))]
        let mut shutdown_rx = futures_util::future::pending::<()>();

        let send_task = tokio::spawn(async move {
            tracing::info!("📍 [send_task] Starting audio send loop");
            let mut chunk_count = 0;
            let mut idle_count = 0;
            
            loop {
                // Windows에서 shutdown 체크
                #[cfg(target_os = "windows")]
                {
                    if let Ok(_) = shutdown_rx.try_recv() {
                        tracing::info!("📍 [send_task] Received shutdown signal");
                        break;
                    }
                }
                
                // 100ms 타임아웃으로 audio stream 대기
                match tokio::time::timeout(
                    std::time::Duration::from_millis(100),
                    audio_stream.next()
                ).await {
                    Ok(Some(data)) => {
                        idle_count = 0; // 데이터를 받았으므로 idle count 리셋
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
                    Ok(None) => {
                        tracing::info!("📍 [send_task] Audio stream ended normally");
                        break;
                    }
                    Err(_) => {
                        idle_count += 1;
                        tracing::debug!("📍 [send_task] Timeout waiting for audio (idle count: {})", idle_count);
                        
                        // 5번 연속 타임아웃(500ms)이면 스트림이 drop된 것으로 간주
                        if idle_count >= 5 {
                            tracing::info!("📍 [send_task] Audio stream appears to be dropped, exiting");
                            break;
                        }
                    }
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

        // Create output stream using unfold
        tracing::info!("📍 [from_audio] Creating output stream");
        
        // Windows-specific stream handling
        #[cfg(target_os = "windows")]
        {
            tracing::info!("📍 [from_audio] Creating Windows-safe WebSocket stream");
            let stream = WindowsSafeWebSocketStream::<T>::new(ws_receiver, send_task, shutdown_tx);
            return Ok(stream);
        }

        // Non-Windows implementation
        #[cfg(not(target_os = "windows"))]
        {
            // 기존 unfold 구현
            let _send_task = send_task; // send task는 백그라운드에서 계속 실행
            
            let stream = unfold(
                Some(ws_receiver),
                move |mut receiver| async move {
                    if let Some(ref mut recv) = receiver {
                        match recv.next().await {
                            Some(msg) => {
                                if let Some(output) = T::from_message(msg) {
                                    Some((output, receiver))
                                } else {
                                    // Skip non-matching messages - 재귀적으로 다음 메시지 확인
                                    recv.next().await
                                        .and_then(|msg| T::from_message(msg))
                                        .map(|output| (output, receiver))
                                }
                            }
                            None => None,
                        }
                    } else {
                        None
                    }
                },
            );

            Ok(stream)
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

// Windows에서 WebSocket 전체를 관리하는 wrapper
#[cfg(target_os = "windows")]
struct WindowsManagedWebSocket {
    ws_stream: Option<tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>
    >>,
    send_task: Option<tokio::task::JoinHandle<()>>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

#[cfg(target_os = "windows")]
impl WindowsManagedWebSocket {
    async fn close(&mut self) {
        tracing::info!("📍 [WindowsManagedWebSocket] Closing WebSocket connection");
        
        // 1. shutdown signal 전송
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
        
        // 2. send task 종료 대기
        if let Some(task) = self.send_task.take() {
            let _ = tokio::time::timeout(
                std::time::Duration::from_millis(500),
                task
            ).await;
        }
        
        // 3. WebSocket 명시적으로 닫기
        if let Some(mut ws) = self.ws_stream.take() {
            tracing::info!("📍 [WindowsManagedWebSocket] Explicitly closing WebSocket");
            let _ = ws.close(None).await;
        }
    }
}

// Windows용 특별한 처리
#[cfg(target_os = "windows")]
pub async fn windows_safe_from_audio<T: WebSocketIO>(
    client: &WebSocketClient,
    audio_stream: impl Stream<Item = bytes::Bytes> + Send + Unpin + 'static,
) -> Result<impl Stream<Item = T::Output>, crate::Error> {
    tracing::info!("📍 [windows_safe_from_audio] Using Windows-specific implementation");
    
    // 별도의 runtime에서 실행
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|_| crate::Error::Unknown)?;
    
    let result = rt.block_on(async {
        client.from_audio::<T>(audio_stream).await
    });
    
    // runtime을 명시적으로 종료
    rt.shutdown_timeout(std::time::Duration::from_millis(100));
    
    result
}

// Windows에서 안전한 WebSocket 스트림 구현
#[cfg(target_os = "windows")]
pub struct WindowsSafeWebSocketStream<T> {
    ws_receiver: Arc<Mutex<Option<SplitStream<WSStream>>>>,
    send_task_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    shutdown_tx: Arc<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>,
    _phantom: std::marker::PhantomData<T>,
}

#[cfg(target_os = "windows")]
impl<T: WebSocketIO> WindowsSafeWebSocketStream<T> {
    fn new(
        ws_receiver: SplitStream<WSStream>,
        send_task: tokio::task::JoinHandle<()>,
        shutdown_tx: tokio::sync::oneshot::Sender<()>,
    ) -> Self {
        Self {
            ws_receiver: Arc::new(Mutex::new(Some(ws_receiver))),
            send_task_handle: Arc::new(Mutex::new(Some(send_task))),
            shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
            _phantom: std::marker::PhantomData,
        }
    }
}

#[cfg(target_os = "windows")]
impl<T: WebSocketIO> Stream for WindowsSafeWebSocketStream<T> {
    type Item = T::Output;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        // receiver가 있는지 확인
        match self.ws_receiver.try_lock() {
            Ok(mut guard) => {
                if let Some(ref mut receiver) = *guard {
                    match Pin::new(receiver).poll_next(cx) {
                        Poll::Ready(Some(msg)) => {
                            if let Some(output) = T::from_message(msg.unwrap()) {
                                Poll::Ready(Some(output))
                            } else {
                                cx.waker().wake_by_ref();
                                Poll::Pending
                            }
                        }
                        Poll::Ready(None) => Poll::Ready(None),
                        Poll::Pending => Poll::Pending,
                    }
                } else {
                    // receiver가 이미 drop됨
                    Poll::Ready(None)
                }
            }
            Err(_) => {
                // lock 실패 시 재시도
                cx.waker().wake_by_ref();
                Poll::Pending
            }
        }
    }
}

#[cfg(target_os = "windows")]
impl<T> Drop for WindowsSafeWebSocketStream<T> {
    fn drop(&mut self) {
        tracing::info!("📍 [WindowsSafeWebSocketStream] Drop starting");
        
        // 1. Shutdown signal 전송 (동기)
        if let Ok(mut tx_guard) = self.shutdown_tx.lock() {
            if let Some(tx) = tx_guard.take() {
                let _ = tx.send(());
                tracing::info!("📍 [WindowsSafeWebSocketStream] Shutdown signal sent");
            }
        }
        
        // 2. Send task 종료 대기를 더 길게 (동기)
        if let Ok(mut task_guard) = self.send_task_handle.lock() {
            if let Some(task) = task_guard.take() {
                tracing::info!("📍 [WindowsSafeWebSocketStream] Waiting for send task to finish gracefully");
                
                // 더 긴 대기 시간 (500ms)
                let start = std::time::Instant::now();
                while !task.is_finished() && start.elapsed() < std::time::Duration::from_millis(500) {
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
                
                if !task.is_finished() {
                    tracing::info!("📍 [WindowsSafeWebSocketStream] Send task still running, aborting");
                    task.abort();
                    // Abort 후 추가 대기
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    tracing::info!("📍 [WindowsSafeWebSocketStream] Send task aborted");
                } else {
                    tracing::info!("📍 [WindowsSafeWebSocketStream] Send task completed naturally");
                }
            }
        }
        
        // 3. Receiver drop (동기)
        if let Ok(mut receiver_guard) = self.ws_receiver.lock() {
            if let Some(_receiver) = receiver_guard.take() {
                tracing::info!("📍 [WindowsSafeWebSocketStream] Receiver dropped");
                // Receiver drop 후 추가 대기
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
        }
        
        // 4. Windows에서 모든 리소스 정리를 위한 더 긴 대기 시간
        tracing::info!("📍 [WindowsSafeWebSocketStream] Final cleanup delay for Windows");
        std::thread::sleep(std::time::Duration::from_millis(200));
        
        // 5. 강제 GC 시도 (Windows에서 메모리 압박 상황 해결)
        tracing::info!("📍 [WindowsSafeWebSocketStream] Forcing cleanup");
        
        tracing::info!("📍 [WindowsSafeWebSocketStream] Drop completed");
    }
}

// Type aliases
type WSStream = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;
type SplitStream<S> = futures_util::stream::SplitStream<S>;
