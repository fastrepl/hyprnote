use std::time::{Duration, Instant};

use statig::prelude::*;

use tauri::Manager;
use tauri_specta::Event;

use futures_util::StreamExt;
use tokio::sync::mpsc;
use tokio::task::JoinSet;

use hypr_audio::AsyncSource;

use crate::SessionEvent;

const SAMPLE_RATE: u32 = 16000;
const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub struct Session {
    app: tauri::AppHandle,
    session_id: Option<String>,
    mic_muted_tx: Option<tokio::sync::watch::Sender<bool>>,
    mic_muted_rx: Option<tokio::sync::watch::Receiver<bool>>,
    speaker_muted_tx: Option<tokio::sync::watch::Sender<bool>>,
    speaker_muted_rx: Option<tokio::sync::watch::Receiver<bool>>,
    silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    session_state_tx: Option<tokio::sync::watch::Sender<State>>,
    tasks: Option<JoinSet<()>>,
}

impl Session {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self {
            app,
            session_id: None,
            mic_muted_tx: None,
            mic_muted_rx: None,
            speaker_muted_tx: None,
            speaker_muted_rx: None,
            silence_stream_tx: None,
            tasks: None,
            session_state_tx: None,
        }
    }

    #[tracing::instrument(skip_all)]
    async fn setup_resources(&mut self, id: impl Into<String>) -> Result<(), crate::Error> {
        use tauri_plugin_db::DatabasePluginExt;

        let user_id = self.app.db_user_id().await?.unwrap();
        let session_id = id.into();
        self.session_id = Some(session_id.clone());

        let (record, language, jargons) = {
            let config = self.app.db_get_config(&user_id).await?;

            let record = config
                .as_ref()
                .is_none_or(|c| c.general.save_recordings.unwrap_or(true));

            let language = config.as_ref().map_or_else(
                || hypr_language::ISO639::En.into(),
                |c| c.general.display_language.clone(),
            );

            let jargons = config.map_or_else(Vec::new, |c| c.general.jargons);

            (record, language, jargons)
        };

        let session = self
            .app
            .db_get_session(&session_id)
            .await?
            .ok_or(crate::Error::NoneSession)?;

        let (mic_muted_tx, mic_muted_rx_main) = tokio::sync::watch::channel(false);
        let (speaker_muted_tx, speaker_muted_rx_main) = tokio::sync::watch::channel(false);
        let (session_state_tx, session_state_rx) =
            tokio::sync::watch::channel(State::RunningActive {});

        let (stop_tx, mut stop_rx) = tokio::sync::mpsc::channel::<()>(1);

        self.mic_muted_tx = Some(mic_muted_tx);
        self.mic_muted_rx = Some(mic_muted_rx_main.clone());
        self.speaker_muted_tx = Some(speaker_muted_tx);
        self.speaker_muted_rx = Some(speaker_muted_rx_main.clone());
        self.session_state_tx = Some(session_state_tx);

        let listen_client = setup_listen_client(&self.app, language, jargons).await?;

        let mic_sample_stream = {
            // Retry mic initialization up to 3 times with delays
            let mut attempts = 0;
            loop {
                attempts += 1;
                tracing::info!("Initializing microphone (attempt {})", attempts);
                
                // 안전한 마이크 초기화 (panic 대신 에러 처리)
                match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    let mut input = hypr_audio::AudioInput::from_mic();
                    input.stream()
                })) {
                    Ok(stream) => {
                        tracing::info!("Successfully initialized microphone");
                        break stream;
                    }
                    Err(panic_info) => {
                        tracing::error!("Microphone initialization panicked (attempt {}): {:?}", attempts, panic_info);
                        if attempts >= 3 {
                            tracing::error!("Failed to initialize microphone after {} attempts", attempts);
                            return Err(crate::Error::StartSessionFailed);
                        }
                        tracing::info!("Retrying microphone initialization in 1 second...");
                        tokio::time::sleep(Duration::from_millis(1000)).await;
                    }
                }
            }
        };
        let mut mic_stream = mic_sample_stream.resample(SAMPLE_RATE).chunks(1024);
        
        // Wait longer for audio system to stabilize
        tokio::time::sleep(Duration::from_millis(500)).await;

        let speaker_sample_stream = {
            // Retry speaker initialization up to 3 times with delays
            let mut attempts = 0;
            loop {
                attempts += 1;
                tracing::info!("Initializing speaker (attempt {})", attempts);
                
                match std::panic::catch_unwind(|| {
                    hypr_audio::AudioInput::from_speaker(None).stream()
                }) {
                    Ok(stream) => {
                        tracing::info!("Successfully initialized speaker");
                        break stream;
                    }
                    Err(e) => {
                        tracing::error!("Failed to initialize speaker (attempt {}): {:?}", attempts, e);
                        if attempts >= 3 {
                            return Err(crate::Error::StartSessionFailed);
                        }
                        tokio::time::sleep(Duration::from_millis(1000)).await;
                    }
                }
            }
        };
        let mut speaker_stream = speaker_sample_stream.resample(SAMPLE_RATE).chunks(1024);

        let chunk_buffer_size: usize = 1024;
        let sample_buffer_size = (SAMPLE_RATE as usize) * 60 * 10;

        let (mic_tx, mut mic_rx) = mpsc::channel::<Vec<f32>>(chunk_buffer_size);
        let (speaker_tx, mut speaker_rx) = mpsc::channel::<Vec<f32>>(chunk_buffer_size);

        let (save_tx, mut save_rx) = mpsc::channel::<f32>(sample_buffer_size);
        let (process_tx, process_rx) = mpsc::channel::<f32>(sample_buffer_size);

        {
            let silence_stream_tx = hypr_audio::AudioOutput::silence();
            self.silence_stream_tx = Some(silence_stream_tx);
        }

        let mut tasks = JoinSet::new();

                tracing::info!("About to spawn mic processing task");
        tasks.spawn({
            let mic_muted_rx = mic_muted_rx_main.clone();
            async move {
                tracing::info!("Mic processing task started - inside async block");
                let mut is_muted = *mic_muted_rx.borrow();
                let watch_rx = mic_muted_rx.clone();
                let mut chunk_count = 0u64;

                tracing::info!("About to start mic stream processing loop");
                
                loop {
                    tracing::debug!("Waiting for next mic stream sample...");
                    
                    match mic_stream.next().await {
                        Some(actual) => {
                            chunk_count += 1;
                            
                            if chunk_count == 1 {
                                tracing::info!("Received first mic chunk with {} samples", actual.len());
                            }
                            
                            if chunk_count % 100 == 0 {
                                tracing::debug!("Processed {} mic chunks", chunk_count);
                            }

                            // 안전한 mute 상태 확인
                            if watch_rx.has_changed().unwrap_or(false) {
                                is_muted = *watch_rx.borrow();
                            }

                            let maybe_muted = if is_muted {
                                vec![0.0; actual.len()]
                            } else {
                                actual
                            };

                            // 안전한 채널 전송 (SendError 무시)
                            if let Err(_) = mic_tx.send(maybe_muted).await {
                                tracing::warn!("Mic channel receiver disconnected, ending mic processing task");
                                break;
                            }
                        },
                        None => {
                            tracing::warn!("Mic stream ended (returned None)");
                            break;
                        }
                    }
                }
                
                tracing::info!("Mic processing task ended after {} chunks", chunk_count);
            }
        });

        tracing::info!("About to spawn speaker processing task");
        tasks.spawn({
            let speaker_muted_rx = speaker_muted_rx_main.clone();
            async move {
                tracing::info!("Speaker processing task started");
                let mut is_muted = *speaker_muted_rx.borrow();
                let watch_rx = speaker_muted_rx.clone();
                let mut chunk_count = 0u64;

                tracing::info!("About to start speaker stream processing loop");
                while let Some(actual) = speaker_stream.next().await {
                    chunk_count += 1;
                    
                    if chunk_count == 1 {
                        tracing::info!("Received first speaker chunk with {} samples", actual.len());
                    }
                    
                    if chunk_count % 100 == 0 {
                        tracing::debug!("Processed {} speaker chunks", chunk_count);
                    }

                    // 안전한 mute 상태 확인
                    if watch_rx.has_changed().unwrap_or(false) {
                        is_muted = *watch_rx.borrow();
                    }

                    let maybe_muted = if is_muted {
                        vec![0.0; actual.len()]
                    } else {
                        actual
                    };

                    // 안전한 채널 전송 (SendError 무시)
                    if let Err(_) = speaker_tx.send(maybe_muted).await {
                        tracing::warn!("Speaker channel receiver disconnected, ending speaker processing task");
                        break;
                    }
                }
                
                tracing::info!("Speaker processing task ended after {} chunks", chunk_count);
            }
        });

        let app_dir = self.app.path().app_data_dir().unwrap();

        tracing::info!("About to spawn audio mixing task");
        tasks.spawn({
            let app = self.app.clone();
            let save_tx = save_tx.clone();

            async move {
                let mut last_broadcast = Instant::now();
                let mut chunk_count = 0u64;

                tracing::info!("Starting audio processing loop");

                while let (Some(mic_chunk), Some(speaker_chunk)) =
                    (mic_rx.recv().await, speaker_rx.recv().await)
                {
                    chunk_count += 1;
                    
                    // 첫 번째 청크 처리 로그
                    if chunk_count == 1 {
                        tracing::info!("Processing first audio chunk (mic: {} samples, speaker: {} samples)", 
                                     mic_chunk.len(), speaker_chunk.len());
                    }

                    if matches!(*session_state_rx.borrow(), State::RunningPaused {}) {
                        let mut rx = session_state_rx.clone();
                        let _ = rx.changed().await;
                        continue;
                    }

                    let now = Instant::now();
                    if now.duration_since(last_broadcast) >= AUDIO_AMPLITUDE_THROTTLE {
                        if let Err(e) = SessionEvent::from((&mic_chunk, &speaker_chunk)).emit(&app)
                        {
                            tracing::error!("broadcast_error: {:?}", e);
                        }
                        last_broadcast = now;
                    }

                    // 오디오 데이터 유효성 검사
                    let mic_has_invalid = mic_chunk.iter().any(|&s| !s.is_finite());
                    let speaker_has_invalid = speaker_chunk.iter().any(|&s| !s.is_finite());
                    
                    if mic_has_invalid {
                        tracing::warn!("Mic chunk contains invalid samples");
                    }
                    if speaker_has_invalid {
                        tracing::warn!("Speaker chunk contains invalid samples");
                    }

                    tracing::debug!("About to mix audio data for chunk {}", chunk_count);
                    
                    let mixed: Vec<f32> = mic_chunk
                        .into_iter()
                        .zip(speaker_chunk.into_iter())
                        .map(|(a, b)| {
                            let result = (a + b).clamp(-1.0, 1.0);
                            if !result.is_finite() {
                                tracing::warn!("Mixed sample is not finite: {} + {} = {}", a, b, result);
                                0.0
                            } else {
                                result
                            }
                        })
                        .collect();

                    tracing::debug!("Successfully mixed {} samples for chunk {}", mixed.len(), chunk_count);

                    // 주기적으로 처리 상태 로그
                    if chunk_count % 100 == 0 {
                        tracing::debug!("Processed {} audio chunks", chunk_count);
                    }

                    tracing::debug!("About to send {} samples to downstream processing", mixed.len());
                    
                    for (sample_idx, &sample) in mixed.iter().enumerate() {
                        // 안전한 STT 처리 채널 전송
                        if let Err(_) = process_tx.send(sample).await {
                            tracing::warn!("STT processing channel receiver disconnected at chunk {} sample {}", chunk_count, sample_idx);
                            return;
                        }

                        // 안전한 WAV 파일 저장 채널 전송 (아직 비활성화 상태)
                        /*
                        if record {
                            if let Err(_) = save_tx.send(sample).await {
                                tracing::warn!("WAV recording channel receiver disconnected at chunk {}", chunk_count);
                            }
                        }
                        */
                    }
                    
                    tracing::debug!("Successfully sent all samples for chunk {}", chunk_count);
                }
                
                tracing::info!("Audio processing loop ended after {} chunks", chunk_count);
            }
        });

        // 임시로 WAV 파일 쓰기를 비활성화하여 문제 지점 확인
        tracing::warn!("WAV file recording temporarily disabled for debugging");
        
        // TODO: Re-enable WAV recording after identifying the issue
        if false { // record {
            tasks.spawn(async move {
                let dir = app_dir.join(session_id);
                
                // 1. 디렉토리 생성 및 권한 확인
                if let Err(e) = std::fs::create_dir_all(&dir) {
                    tracing::error!("Failed to create directory {:?}: {:?}", dir, e);
                    return;
                }
                
                // Windows에서 디렉토리 쓰기 권한 확인
                let test_file = dir.join(".write_test");
                if let Err(e) = std::fs::write(&test_file, b"test") {
                    tracing::error!("No write permission to directory {:?}: {:?}", dir, e);
                    return;
                } else {
                    let _ = std::fs::remove_file(test_file);
                }
                
                let path = dir.join("audio.wav");
                tracing::info!("WAV file path: {:?}", path);

                let wav_spec = hound::WavSpec {
                    channels: 2,
                    sample_rate: SAMPLE_RATE,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                };

                // 2. 파일 핸들 안전성 확인 및 생성
                let mut wav = if path.exists() {
                    match std::fs::metadata(&path) {
                        Ok(metadata) => {
                            let file_size = metadata.len();
                            tracing::info!("Existing WAV file size: {} bytes", file_size);
                            
                            if file_size < 44 { // WAV 헤더 최소 크기
                                tracing::warn!("WAV file too small ({} bytes), recreating", file_size);
                                if let Err(e) = std::fs::remove_file(&path) {
                                    tracing::error!("Failed to remove corrupted WAV file: {:?}", e);
                                    return;
                                }
                                match hound::WavWriter::create(&path, wav_spec) {
                                    Ok(writer) => {
                                        tracing::info!("Successfully created new WAV file");
                                        writer
                                    },
                                    Err(e) => {
                                        tracing::error!("Failed to create new WAV file: {:?}", e);
                                        return;
                                    }
                                }
                            } else {
                                tracing::info!("Attempting to append to existing WAV file");
                                match hound::WavWriter::append(&path) {
                                    Ok(writer) => {
                                        tracing::info!("Successfully opened WAV file for appending");
                                        writer
                                    },
                                    Err(e) => {
                                        tracing::error!("Failed to append to WAV file: {:?}, creating new file", e);
                                        if let Err(e) = std::fs::remove_file(&path) {
                                            tracing::error!("Failed to remove WAV file for recreation: {:?}", e);
                                            return;
                                        }
                                        match hound::WavWriter::create(&path, wav_spec) {
                                            Ok(writer) => {
                                                tracing::info!("Successfully created new WAV file after failed append");
                                                writer
                                            },
                                            Err(e) => {
                                                tracing::error!("Failed to create WAV file after failed append: {:?}", e);
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        Err(e) => {
                            tracing::error!("Failed to get file metadata: {:?}", e);
                            return;
                        }
                    }
                } else {
                    tracing::info!("Creating new WAV file at {:?}", path);
                    match hound::WavWriter::create(&path, wav_spec) {
                        Ok(writer) => {
                            tracing::info!("Successfully created new WAV file");
                            writer
                        },
                        Err(e) => {
                            tracing::error!("Failed to create new WAV file: {:?}", e);
                            return;
                        }
                    }
                };

                // 3. 안전한 샘플 쓰기 처리
                let mut sample_count = 0u64;
                let mut error_count = 0u32;
                const MAX_ERRORS: u32 = 10;

                tracing::info!("Starting WAV sample write loop");

                while let Some(sample) = save_rx.recv().await {
                    // 첫 번째 샘플 수신 로그
                    if sample_count == 0 {
                        tracing::info!("Received first audio sample for WAV recording");
                    }

                    // Windows에서 무한대나 NaN 값 체크
                    if !sample.is_finite() {
                        tracing::warn!("Received invalid sample value: {}, skipping", sample);
                        continue;
                    }

                    match wav.write_sample(sample) {
                        Ok(_) => {
                            sample_count += 1;
                            
                            // 더 자주 로그 출력 (100ms마다)
                            if sample_count % 1600 == 0 { // 100ms마다 로그 (16kHz)
                                tracing::info!("Written {} samples to WAV file", sample_count);
                            }
                        },
                        Err(e) => {
                            error_count += 1;
                            tracing::error!("Failed to write sample {} (error {}): {:?}", sample_count, error_count, e);
                            
                            if error_count >= MAX_ERRORS {
                                tracing::error!("Too many write errors ({}), stopping WAV recording", error_count);
                                break;
                            }
                        }
                    }

                    // 매우 많은 샘플이 처리되면 중간 flush
                    if sample_count % 16000 == 0 {
                        tracing::debug!("Attempting to flush WAV file at {} samples", sample_count);
                        // hound에는 명시적 flush가 없지만, 주기적으로 상태 체크
                    }
                }

                // 4. 안전한 파일 마무리
                tracing::info!("Finalizing WAV file with {} samples written", sample_count);
                if let Err(e) = wav.finalize() {
                    tracing::error!("Failed to finalize WAV file: {:?}", e);
                } else {
                    tracing::info!("Successfully finalized WAV file");
                }
            });
        }

        // TODO
        // let timeline = Arc::new(Mutex::new(initialize_timeline(&session).await));
        
        // STT 클라이언트 초기화도 임시로 비활성화
        tracing::warn!("STT client initialization temporarily disabled for debugging");
        
        // TODO: Re-enable STT client after identifying the issue
        /*
        tracing::info!("Creating audio stream for STT");
        let audio_stream = hypr_audio::ReceiverStreamSource::new(process_rx, SAMPLE_RATE);

        tracing::info!("Initializing STT listen stream");
        let listen_stream = match listen_client.from_audio(audio_stream).await {
            Ok(stream) => {
                tracing::info!("Successfully initialized STT listen stream");
                stream
            },
            Err(e) => {
                tracing::error!("Failed to initialize STT listen stream: {:?}", e);
                return Err(e.into());
            }
        };
        */

        // STT 결과 처리 태스크도 비활성화
        /*
        tracing::info!("Spawning STT result processing task");
        tasks.spawn({
            let app = self.app.clone();
            let stop_tx = stop_tx.clone();

            async move {
                tracing::info!("STT result processing task started");
                futures_util::pin_mut!(listen_stream);

                while let Some(result) = listen_stream.next().await {
                    tracing::debug!("Received STT result with {} words", result.words.len());
                    
                    // 임시로 DB 접근을 비활성화하여 문제 지점 확인
                    tracing::warn!("STT result DB update temporarily disabled for debugging");
                    
                    // TODO: Re-enable DB access after identifying the issue
                    if let Err(e) = (SessionEvent::Words {
                        words: result.words, // 직접 STT 결과 사용
                    }).emit(&app) {
                        tracing::error!("Failed to emit words event: {:?}", e);
                    }
                    
                    // We don't have to do this, and inefficient. But this is what works at the moment.
                    match update_session(&app, &session.id, result.words).await {
                        Ok(updated_words) => {
                            if let Err(e) = (SessionEvent::Words {
                                words: updated_words,
                            }).emit(&app) {
                                tracing::error!("Failed to emit words event: {:?}", e);
                            }
                        },
                        Err(e) => {
                            tracing::error!("Failed to update session with STT result: {:?}", e);
                        }
                    }
                }

                tracing::info!("STT result processing task ended");
                if stop_tx.send(()).await.is_err() {
                    tracing::warn!("failed_to_send_stop_signal");
                }
            }
        });
        */

        // Stop signal handler 태스크도 비활성화
        /*
        tracing::info!("Spawning stop signal handler task");
        let app_handle = self.app.clone();
        tasks.spawn(async move {
            tracing::debug!("Stop signal handler task started");
            if stop_rx.recv().await.is_some() {
                tracing::info!("Received stop signal");
                if let Some(state) = app_handle.try_state::<crate::SharedState>() {
                    let mut guard = state.lock().await;
                    guard.fsm.handle(&crate::fsm::StateEvent::Stop).await;
                } else {
                    tracing::warn!("Failed to get shared state for stop signal");
                }
            }
            tracing::debug!("Stop signal handler task ended");
        });
        */

        tracing::info!("Storing task set in session");
        self.tasks = Some(tasks);

        tracing::info!("Successfully completed setup_resources");
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn teardown_resources(&mut self) {
        self.session_id = None;

        if let Some(tx) = self.silence_stream_tx.take() {
            let _ = tx.send(());
        }

        if let Some(mut tasks) = self.tasks.take() {
            tasks.abort_all();
            while let Some(res) = tasks.join_next().await {
                let _ = res;
            }
        }
    }

    pub fn is_mic_muted(&self) -> bool {
        match &self.mic_muted_rx {
            Some(rx) => *rx.borrow(),
            None => false,
        }
    }

    pub fn is_speaker_muted(&self) -> bool {
        match &self.speaker_muted_rx {
            Some(rx) => *rx.borrow(),
            None => false,
        }
    }
}

async fn setup_listen_client<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    language: hypr_language::Language,
    jargons: Vec<String>,
) -> Result<crate::client::ListenClient, crate::Error> {
    let api_base = {
        use tauri_plugin_connector::{Connection, ConnectorPluginExt};
        let conn: Connection = app.get_stt_connection().await?.into();
        conn.api_base
    };

    let api_key = {
        use tauri_plugin_auth::AuthPluginExt;
        app.get_from_vault(tauri_plugin_auth::VaultKey::RemoteServer)
            .unwrap_or_default()
            .unwrap_or_default()
    };

    tracing::info!(api_base = ?api_base, api_key = ?api_key, language = ?language, "listen_client");

    let static_prompt = format!(
        "{} / {}:",
        jargons.join(", "),
        language
            .text_transcript()
            .unwrap_or("transcript".to_string())
    );

    Ok(crate::client::ListenClient::builder()
        .api_base(api_base)
        .api_key(api_key)
        .params(hypr_listener_interface::ListenParams {
            language,
            static_prompt,
            ..Default::default()
        })
        .build())
}

async fn update_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session_id: impl Into<String>,
    words: Vec<hypr_listener_interface::Word>,
) -> Result<Vec<hypr_listener_interface::Word>, crate::Error> {
    use tauri_plugin_db::DatabasePluginExt;

    let session_id = session_id.into();
    tracing::debug!("Updating session {} with {} new words", session_id, words.len());

    // TODO: not ideal. We might want to only do "update" everywhere instead of upserts.
    // We do this because it is highly likely that the session fetched in the listener is stale (session can be updated on the React side).
    let mut session = match app.db_get_session(&session_id).await {
        Ok(Some(session)) => {
            tracing::debug!("Successfully retrieved session from DB for update");
            session
        },
        Ok(None) => {
            tracing::error!("Session not found for update: {}", session_id);
            return Err(crate::Error::NoneSession);
        },
        Err(e) => {
            tracing::error!("Failed to retrieve session for update: {:?}", e);
            return Err(e.into());
        }
    };

    session.words.extend(words);
    
    match app.db_upsert_session(session.clone()).await {
        Ok(_) => {
            tracing::debug!("Successfully updated session with new words (total: {})", session.words.len());
            Ok(session.words)
        },
        Err(e) => {
            tracing::error!("Failed to upsert session: {:?}", e);
            Err(e.into())
        }
    }
}

pub enum StateEvent {
    Start(String),
    Stop,
    Pause,
    Resume,
    MicMuted(bool),
    SpeakerMuted(bool),
}

#[state_machine(
    initial = "State::inactive()",
    on_transition = "Self::on_transition",
    state(derive(Debug, Clone, PartialEq))
)]
impl Session {
    #[superstate]
    async fn common(&mut self, event: &StateEvent) -> Response<State> {
        match event {
            StateEvent::MicMuted(muted) => {
                if let Some(tx) = &self.mic_muted_tx {
                    let _ = tx.send(*muted);
                    let _ = SessionEvent::MicMuted { value: *muted }.emit(&self.app);
                }
                Handled
            }
            StateEvent::SpeakerMuted(muted) => {
                if let Some(tx) = &self.speaker_muted_tx {
                    let _ = tx.send(*muted);
                    let _ = SessionEvent::SpeakerMuted { value: *muted }.emit(&self.app);
                }
                Handled
            }
            _ => Super,
        }
    }

    #[state(superstate = "common", entry_action = "enter_running_active")]
    async fn running_active(&mut self, event: &StateEvent) -> Response<State> {
        match event {
            StateEvent::Start(incoming_session_id) => match &self.session_id {
                Some(current_id) if current_id != incoming_session_id => {
                    Transition(State::inactive())
                }
                _ => Handled,
            },
            StateEvent::Stop => Transition(State::inactive()),
            StateEvent::Pause => Transition(State::running_paused()),
            StateEvent::Resume => Handled,
            _ => Super,
        }
    }

    #[state(superstate = "common")]
    async fn running_paused(&mut self, event: &StateEvent) -> Response<State> {
        match event {
            StateEvent::Start(incoming_session_id) => match &self.session_id {
                Some(current_id) if current_id != incoming_session_id => {
                    Transition(State::inactive())
                }
                _ => Handled,
            },
            StateEvent::Stop => Transition(State::inactive()),
            StateEvent::Pause => Handled,
            StateEvent::Resume => Transition(State::running_active()),
            _ => Super,
        }
    }

    #[state(
        superstate = "common",
        entry_action = "enter_inactive",
        exit_action = "exit_inactive"
    )]
    async fn inactive(&mut self, event: &StateEvent) -> Response<State> {
        match event {
            StateEvent::Start(id) => match self.setup_resources(id).await {
                Ok(_) => Transition(State::running_active()),
                Err(e) => {
                    // TODO: emit event
                    tracing::error!("error: {:?}", e);
                    Transition(State::inactive())
                }
            },
            StateEvent::Stop => Handled,
            StateEvent::Pause => Handled,
            StateEvent::Resume => Handled,
            _ => Super,
        }
    }

    #[action]
    async fn enter_inactive(&mut self) {
        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = self.app.set_start_disabled(false);
        }

        {
            use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
            let _ = self.app.window_hide(HyprWindow::Control);
        }

        if let Some(session_id) = &self.session_id {
            use tauri_plugin_db::DatabasePluginExt;

            if let Ok(Some(mut session)) = self.app.db_get_session(session_id).await {
                session.record_end = Some(chrono::Utc::now());
                let _ = self.app.db_upsert_session(session).await;
            }
        }

        self.teardown_resources().await;
    }

    #[action]
    async fn exit_inactive(&mut self) {
        use tauri_plugin_tray::TrayPluginExt;
        let _ = self.app.set_start_disabled(true);
    }

    #[action]
    async fn enter_running_active(&mut self) {
        tracing::info!("Entering RunningActive state");
        
        // {
        //     use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
        //     let _ = self.app.window_show(HyprWindow::Control);
        // }

        if let Some(session_id) = &self.session_id {
            tracing::info!("Updating session record_start time for session: {}", session_id);
            
            // 임시로 DB 접근을 비활성화하여 문제 지점 확인
            tracing::warn!("DB access temporarily disabled for debugging");
            
            // TODO: Re-enable DB access after identifying the issue
            /*
            use tauri_plugin_db::DatabasePluginExt;

            match self.app.db_get_session(session_id).await {
                Ok(Some(mut session)) => {
                    tracing::debug!("Successfully retrieved session from DB");
                    session.record_start = Some(chrono::Utc::now());
                    match self.app.db_upsert_session(session).await {
                        Ok(_) => {
                            tracing::debug!("Successfully updated session record_start time");
                        },
                        Err(e) => {
                            tracing::error!("Failed to update session record_start time: {:?}", e);
                        }
                    }
                },
                Ok(None) => {
                    tracing::warn!("Session not found in DB: {}", session_id);
                },
                Err(e) => {
                    tracing::error!("Failed to get session from DB: {:?}", e);
                }
            }
            */
        }
        
        tracing::info!("Completed enter_running_active");
    }

    fn on_transition(&mut self, source: &State, target: &State) {
        #[cfg(debug_assertions)]
        tracing::info!("transitioned from `{:?}` to `{:?}`", source, target);

        tracing::info!("on_transition function entered - about to process state: {:?}", target);

        // 임시로 이벤트 전송을 완전히 비활성화하여 문제 지점 확인
        tracing::warn!("Session event emission temporarily disabled for debugging");
        
        // TODO: Re-enable event emission after identifying the issue
        /*
        // 안전한 이벤트 전송 - .unwrap() 대신 에러 처리
        tracing::debug!("Emitting session event for state: {:?}", target);
        let emit_result = match target {
            State::RunningActive {} => {
                tracing::debug!("Emitting RunningActive event");
                SessionEvent::RunningActive {}.emit(&self.app)
            },
            State::RunningPaused {} => {
                tracing::debug!("Emitting RunningPaused event");
                SessionEvent::RunningPaused {}.emit(&self.app)
            },
            State::Inactive {} => {
                tracing::debug!("Emitting Inactive event");
                SessionEvent::Inactive {}.emit(&self.app)
            },
        };

        match emit_result {
            Ok(_) => {
                tracing::debug!("Successfully emitted session event for state: {:?}", target);
            },
            Err(e) => {
                tracing::error!("Failed to emit session event for state {:?}: {:?}", target, e);
                // 에러가 발생해도 계속 진행 (panic 방지)
            }
        }
        */

        // 안전한 내부 상태 채널 업데이트 (SendError 무시)
        tracing::debug!("Updating internal session state channel for: {:?}", target);
        if let Some(tx) = &self.session_state_tx {
            // SendError가 발생해도 panic하지 않도록 안전하게 처리
            let _ = tx.send(target.clone());
            tracing::debug!("Internal session state channel update attempted");
        } else {
            tracing::debug!("Session state channel not available");
        }
        
        tracing::info!("Completed on_transition function for: {:?}", target);
    }
}

impl serde::Serialize for State {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            State::Inactive {} => serializer.serialize_str("inactive"),
            State::RunningActive {} => serializer.serialize_str("running_active"),
            State::RunningPaused {} => serializer.serialize_str("running_paused"),
        }
    }
}

impl specta::Type for State {
    fn inline(
        _type_map: &mut specta::TypeCollection,
        _generics: specta::Generics,
    ) -> specta::DataType {
        specta::datatype::PrimitiveType::String.into()
    }
}
