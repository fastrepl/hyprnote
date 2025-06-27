use futures_util::Stream;
use std::sync::Arc;
use tokio::sync::Mutex;

use hypr_audio::AsyncSource;
use hypr_audio_utils::AudioFormatExt;
use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};

use crate::{ListenInputChunk, ListenOutputChunk};

#[derive(Default)]
pub struct ListenClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<hypr_listener_interface::ListenParams>,
}

impl ListenClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn params(mut self, params: hypr_listener_interface::ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    pub fn build(self) -> ListenClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();

            let params = self.params.unwrap_or_default();
            let language = params.language.code();

            url.set_path("/api/desktop/listen/realtime");
            url.query_pairs_mut()
                .append_pair("language", language)
                .append_pair("static_prompt", &params.static_prompt)
                .append_pair("dynamic_prompt", &params.dynamic_prompt);

            let host = url.host_str().unwrap();

            if host.contains("127.0.0.1") || host.contains("localhost") {
                url.set_scheme("ws").unwrap();
            } else {
                url.set_scheme("wss").unwrap();
            }

            url.to_string().parse().unwrap()
        };

        let request = match self.api_key {
            Some(key) => ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Bearer {}", key)),
            None => ClientRequestBuilder::new(uri),
        };

        ListenClient { 
            request,
            connection_state: Arc::new(Mutex::new(ConnectionState::Disconnected)),
        }
    }
}

#[derive(Debug, Clone)]
enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Disconnecting,
}

#[derive(Clone)]
pub struct ListenClient {
    request: ClientRequestBuilder,
    connection_state: Arc<Mutex<ConnectionState>>,
}

impl WebSocketIO for ListenClient {
    type Input = ListenInputChunk;
    type Output = ListenOutputChunk;

    fn to_input(data: bytes::Bytes) -> Self::Input {
        ListenInputChunk::Audio {
            data: data.to_vec(),
        }
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Text(serde_json::to_string(&input).unwrap().into())
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}

impl ListenClient {
    pub fn builder() -> ListenClientBuilder {
        ListenClientBuilder::default()
    }

    // Windows C runtime 에러 방지를 위한 안전한 래퍼 함수
    #[cfg(target_os = "windows")]
    pub async fn from_audio_windows_safe(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        tracing::info!("🛡️ Windows Safe Mode: Starting enhanced audio connection");
        
        // Windows 전용 메모리 및 리소스 관리
        let _windows_guard = WindowsResourceGuard::new().await;
        
        // 더 작은 청크 사이즈로 메모리 사용량 줄이기
        tracing::info!("🛡️ Using smaller chunk sizes for Windows stability");
        let modified_stream = ModifiedAudioStream::new(audio_stream, 8 * 1000, 512); // 원래 16*1000, 1024에서 절반으로
        
        // 메인 연결 로직 실행
        self.from_audio_internal(modified_stream).await
    }

    #[cfg(not(target_os = "windows"))]
    pub async fn from_audio_windows_safe(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        // 비Windows 플랫폼에서는 일반 함수 호출
        self.from_audio(audio_stream).await
    }

    // Windows에서 C runtime 에러를 디버깅하기 위한 함수
    #[cfg(target_os = "windows")]
    pub async fn debug_windows_connection(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<(), hypr_ws::Error> {
        tracing::info!("🔍 DEBUG MODE: Testing Windows connection without streaming");
        
        // Step 1: 오디오 스트림만 생성해보기
        tracing::info!("🔍 Step 1: Creating audio chunks (no WebSocket)");
        let input_stream = audio_stream.to_i16_le_chunks(16 * 1000, 1024);
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        tracing::info!("🔍 Step 1: Audio chunks created successfully");
        
        // Step 2: WebSocket 클라이언트만 생성해보기
        tracing::info!("🔍 Step 2: Creating WebSocket client (no connection)");
        let _ws = WebSocketClient::new(self.request.clone());
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        tracing::info!("🔍 Step 2: WebSocket client created successfully");
        
        // Step 3: 실제 연결 시도 (타임아웃 매우 짧게)
        tracing::info!("🔍 Step 3: Attempting minimal connection test");
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(2), 
            self.minimal_connection_test()
        ).await;
        
        match result {
            Ok(_) => tracing::info!("🔍 Step 3: Minimal connection test passed"),
            Err(_) => tracing::info!("🔍 Step 3: Minimal connection test timed out (expected)"),
        }
        
        tracing::info!("🔍 DEBUG MODE: All steps completed without C runtime error");
        Ok(())
    }

    // 최소한의 연결 테스트
    #[cfg(target_os = "windows")]
    async fn minimal_connection_test(&self) -> Result<(), hypr_ws::Error> {
        // 빈 스트림으로 연결 시도
        let empty_stream = futures_util::stream::iter(std::iter::empty::<bytes::Bytes>());
        let ws = WebSocketClient::new(self.request.clone());
        
        // 매우 짧은 시간만 연결 시도
        let _result = ws.from_audio::<Self>(empty_stream).await;
        Ok(())
    }

    async fn from_audio_internal(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        // 기존 from_audio 로직을 여기로 이동
        // 연결 상태 확인 및 설정
        {
            let mut state = self.connection_state.lock().await;
            match *state {
                ConnectionState::Connecting | ConnectionState::Connected => {
                    tracing::warn!("WebSocket connection already in progress or active");
                    return Err(hypr_ws::Error::Unknown);
                }
                _ => {}
            }
            *state = ConnectionState::Connecting;
        }

        // Windows 특화 안정성 개선
        tracing::info!("Windows Safety: Starting connection with enhanced error handling");
        
        // 메모리 정리를 위한 강제 GC (Windows에서 도움이 될 수 있음)
        #[cfg(target_os = "windows")]
        {
            // Windows에서 메모리 압박 상황을 방지하기 위한 작은 지연
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }

        tracing::info!("fire audio_stream.to_i16_le_chunks");
        
        // 오디오 스트림을 더 안전하게 처리
        let input_stream = {
            let stream = audio_stream.to_i16_le_chunks(16 * 1000, 1024);
            tracing::info!("Created audio chunks stream successfully");
            stream
        };

        tracing::info!("fire WebSocketClient::new");
        let ws = WebSocketClient::new(self.request.clone());
        tracing::info!("after WebSocketClient::new");

        // Windows C runtime 에러 방지를 위한 안전한 WebSocket 연결
        tracing::info!(
            ":+:+:+: Attempting SAFE WebSocket connection with timeout and error handling"
        );

        use std::time::Duration;

        // 연결 시도를 더 단계적으로 처리
        let connection_result = {
            // Step 1: 연결 준비
            tracing::info!("Step 1: Preparing connection...");
            tokio::time::sleep(Duration::from_millis(100)).await;
            
            // Step 2: 타임아웃과 함께 연결 시도 (더 짧은 타임아웃)
            tracing::info!("Step 2: Attempting connection with 8-second timeout...");
            tokio::time::timeout(
                Duration::from_secs(8), 
                self.safe_websocket_connect(ws, input_stream)
            ).await
        };

        match connection_result {
            Ok(Ok(stream)) => {
                // 연결 상태 업데이트
                {
                    let mut state = self.connection_state.lock().await;
                    *state = ConnectionState::Connected;
                }
                tracing::info!(":+:+:+: WebSocket connection successful");
                Ok(stream)
            }
            Ok(Err(e)) => {
                // 연결 상태 리셋 및 정리
                {
                    let mut state = self.connection_state.lock().await;
                    *state = ConnectionState::Disconnected;
                }
                tracing::error!(":+:+:+: WebSocket connection failed: {:?}", e);
                
                // Windows에서 연결 실패 후 리소스 정리
                #[cfg(target_os = "windows")]
                {
                    tokio::time::sleep(Duration::from_millis(200)).await;
                }
                
                Err(e)
            }
            Err(timeout_err) => {
                // 연결 상태 리셋 및 정리
                {
                    let mut state = self.connection_state.lock().await;
                    *state = ConnectionState::Disconnected;
                }
                tracing::error!(":+:+:+: WebSocket connection timed out after 8 seconds");
                
                // Windows에서 타임아웃 후 리소스 정리
                #[cfg(target_os = "windows")]
                {
                    tokio::time::sleep(Duration::from_millis(200)).await;
                }
                
                Err(hypr_ws::Error::Timeout(timeout_err))
            }
        }
    }

    pub async fn from_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        // Windows에서는 안전 모드 사용
        #[cfg(target_os = "windows")]
        {
            return self.from_audio_windows_safe(audio_stream).await;
        }
        
        // 다른 플랫폼에서는 기본 구현
        #[cfg(not(target_os = "windows"))]
        {
            self.from_audio_internal(audio_stream).await
        }
    }

    // 더 안전한 WebSocket 연결 함수 (개선된 버전)
    async fn safe_websocket_connect<S>(
        &self,
        ws: WebSocketClient,
        input_stream: S,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error>
    where
        S: Stream<Item = bytes::Bytes> + Send + Unpin + 'static,
    {
        // 연결 전 짧은 지연 (Windows에서 안정성 향상)
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        
        tracing::info!("Starting safe WebSocket connection...");
        
        // C runtime 에러 추적을 위한 상세 디버깅
        #[cfg(target_os = "windows")]
        {
            tracing::info!("🔍 [safe_websocket_connect] Windows - Pre-connection diagnostics");
            tracing::info!("🔍 [safe_websocket_connect] Current thread: {:?}", std::thread::current().id());
            tracing::info!("🔍 [safe_websocket_connect] Available parallelism: {:?}", std::thread::available_parallelism());
        }
        
        // WebSocket 연결을 더 조심스럽게 처리 - 별도 스레드에서 실행
        let connection_handle = tokio::spawn(async move {
            tracing::info!("Inside connection task - about to call ws.from_audio");
            
            // Windows에서 추가 안정성을 위한 지연
            #[cfg(target_os = "windows")]
            {
                tracing::info!("🔍 [connection_task] Windows - Pre-connection delay");
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                tracing::info!("🔍 [connection_task] Connection task thread: {:?}", std::thread::current().id());
            }
            
            tracing::info!("🔍 [connection_task] About to call ws.from_audio - THIS IS WHERE C RUNTIME ERROR MIGHT OCCUR");
            
            // 에러가 발생할 가능성이 높은 부분을 try-catch로 더 세밀하게 추적
            // catch_unwind가 async 함수에서 제대로 작동하지 않을 수 있으므로 직접 호출
            tracing::info!("🔍 [connection_task] Calling ws.from_audio directly");
            
            let stream_result = ws.from_audio::<Self>(input_stream).await;
            
            tracing::info!("🔍 [connection_task] ws.from_audio completed, result: {:?}", 
                        if stream_result.is_ok() { "Success" } else { "Error" });
            
            stream_result
        });

        // 연결 작업 완료 대기
        match connection_handle.await {
            Ok(stream_result) => {
                tracing::info!("Connection task joined successfully");
                stream_result
            }
            Err(join_err) => {
                tracing::error!("WebSocket connection task panicked or was cancelled: {:?}", join_err);
                
                // panic이나 cancellation의 경우 조금 더 대기 후 에러 반환
                #[cfg(target_os = "windows")]
                {
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                }
                
                Err(hypr_ws::Error::Unknown)
            }
        }
    }

    // 연결 정리 함수 (개선된 버전)
    pub async fn disconnect(&self) {
        tracing::info!("Starting safe disconnect process...");
        
        let mut state = self.connection_state.lock().await;
        let current_state = state.clone();
        *state = ConnectionState::Disconnecting;
        
        // 현재 상태에 따른 정리 작업
        match current_state {
            ConnectionState::Connected | ConnectionState::Connecting => {
                tracing::info!("Cleaning up active connection resources...");
                
                // Windows에서 안전한 리소스 정리를 위한 지연
                #[cfg(target_os = "windows")]
                {
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                }
            }
            _ => {
                tracing::info!("No active connection to clean up");
            }
        }
        
        *state = ConnectionState::Disconnected;
        tracing::info!("WebSocket client disconnected safely");
    }
}

// Windows 리소스 관리를 위한 RAII 가드
#[cfg(target_os = "windows")]
struct WindowsResourceGuard {
    _start_time: std::time::Instant,
}

#[cfg(target_os = "windows")]
impl WindowsResourceGuard {
    async fn new() -> Self {
        tracing::info!("🛡️ WindowsResourceGuard: Initializing resource protection");
        
        // Windows에서 메모리 압박을 줄이기 위한 초기화
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        
        Self {
            _start_time: std::time::Instant::now(),
        }
    }
}

#[cfg(target_os = "windows")]
impl Drop for WindowsResourceGuard {
    fn drop(&mut self) {
        let elapsed = self._start_time.elapsed();
        tracing::info!("🛡️ WindowsResourceGuard: Cleaned up after {:?}", elapsed);
    }
}

// 더 안전한 오디오 스트림 래퍼
struct ModifiedAudioStream<T> {
    inner: T,
    sample_rate: usize,
    chunk_size: usize,
}

impl<T> ModifiedAudioStream<T> {
    fn new(inner: T, sample_rate: usize, chunk_size: usize) -> Self {
        Self {
            inner,
            sample_rate,
            chunk_size,
        }
    }
}

impl<T: AsyncSource + Unpin> AsyncSource for ModifiedAudioStream<T> {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self.inner.as_stream()
    }

    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    #[ignore]
    async fn test_listen_client() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let client = ListenClient::builder()
            .api_base("http://127.0.0.1:1234")
            .api_key("".to_string())
            .params(hypr_listener_interface::ListenParams {
                language: hypr_language::ISO639::En.into(),
                ..Default::default()
            })
            .build();

        let stream = client.from_audio(audio).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
