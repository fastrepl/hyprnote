use crate::CalibrationProgressEvent;
use crate::ListenerPluginExt;
use owhisper_interface::Word2;
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub async fn list_microphone_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_audio::DeviceInfo>, String> {
    app.list_microphone_devices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn list_speaker_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_audio::DeviceInfo>, String> {
    app.list_speaker_devices().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_microphone_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_current_microphone_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_speaker_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_current_speaker_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_microphone_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_name: String,
) -> Result<(), String> {
    app.set_microphone_device(device_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_speaker_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_name: String,
) -> Result<(), String> {
    app.set_speaker_device(device_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_default_speaker_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.set_default_speaker_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_microphone_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.check_microphone_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_system_audio_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.check_system_audio_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn request_microphone_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_microphone_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn request_system_audio_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_system_audio_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn open_microphone_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_microphone_access_settings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn open_system_audio_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_system_audio_access_settings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_mic_muted<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<bool, String> {
    Ok(app.get_mic_muted().await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_speaker_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    Ok(app.get_speaker_muted().await)
}

#[tauri::command]
#[specta::specta]
pub async fn set_mic_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    muted: bool,
) -> Result<(), String> {
    app.set_mic_muted(muted).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_speaker_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    muted: bool,
) -> Result<(), String> {
    app.set_speaker_muted(muted).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn start_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    app.start_session(session_id).await;
    match app.get_state().await {
        crate::fsm::State::RunningActive { .. } => Ok(()),
        _ => Err(crate::Error::StartSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_session().await;
    match app.get_state().await {
        crate::fsm::State::Inactive { .. } => Ok(()),
        _ => Err(crate::Error::StopSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn pause_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.pause_session().await;
    match app.get_state().await {
        crate::fsm::State::RunningPaused { .. } => Ok(()),
        _ => Err(crate::Error::PauseSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn resume_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.resume_session().await;
    match app.get_state().await {
        crate::fsm::State::RunningActive { .. } => Ok(()),
        _ => Err(crate::Error::ResumeSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_state<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::fsm::State, String> {
    Ok(app.get_state().await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_audio_gains<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<AudioGains, String> {
    use tauri_plugin_db::DatabasePluginExt;

    let user_id = app
        .db_user_id()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No user ID found")?;

    let config = app
        .db_get_config(&user_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Config not found")?;

    Ok(AudioGains {
        pre_mic_gain: config.audio.pre_mic_gain.unwrap_or(1.0),
        post_mic_gain: config.audio.post_mic_gain.unwrap_or(1.5),
        pre_speaker_gain: config.audio.pre_speaker_gain.unwrap_or(0.8),
        post_speaker_gain: config.audio.post_speaker_gain.unwrap_or(1.0),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn set_audio_gains<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    gains: AudioGains,
) -> Result<(), String> {
    use tauri::Manager;
    use tauri_plugin_db::DatabasePluginExt;

    let user_id = app
        .db_user_id()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No user ID found")?;

    let mut config = app
        .db_get_config(&user_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Config not found")?;

    config.audio.pre_mic_gain = Some(gains.pre_mic_gain);
    config.audio.post_mic_gain = Some(gains.post_mic_gain);
    config.audio.pre_speaker_gain = Some(gains.pre_speaker_gain);
    config.audio.post_speaker_gain = Some(gains.post_speaker_gain);

    // Access the database through ManagedState to call set_config
    let state = app.state::<tauri_plugin_db::ManagedState>();
    let guard = state.lock().await;
    let db = guard.db.as_ref().ok_or("Database not initialized")?;

    db.set_config(config).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AudioGains {
    pub pre_mic_gain: f32,
    pub post_mic_gain: f32,
    pub pre_speaker_gain: f32,
    pub post_speaker_gain: f32,
}

// Mic test state management
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;

// AtomicF32 wrapper for atomic float operations
struct AtomicF32 {
    inner: std::sync::atomic::AtomicU32,
}

impl AtomicF32 {
    fn new(value: f32) -> Self {
        Self {
            inner: std::sync::atomic::AtomicU32::new(value.to_bits()),
        }
    }

    fn load(&self, order: Ordering) -> f32 {
        f32::from_bits(self.inner.load(order))
    }

    fn store(&self, value: f32, order: Ordering) {
        self.inner.store(value.to_bits(), order);
    }
}

struct MicTestState {
    running: Arc<AtomicBool>,
    thread_handle: Arc<std::sync::Mutex<Option<JoinHandle<()>>>>,
    gain: Arc<AtomicF32>,
}

impl MicTestState {
    fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: Arc::new(std::sync::Mutex::new(None)),
            gain: Arc::new(AtomicF32::new(1.5)),
        }
    }

    fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    fn set_gain(&self, gain: f32) {
        self.gain.store(gain, Ordering::Relaxed);
    }

    fn start<R: tauri::Runtime>(
        &self,
        gain: f32,
        app_handle: tauri::AppHandle<R>,
    ) -> Result<(), String> {
        if self.is_running() {
            return Err("Mic test already running".to_string());
        }

        // Set initial gain
        self.gain.store(gain, Ordering::Relaxed);

        let running = self.running.clone();
        running.store(true, Ordering::Relaxed);

        let thread_running = running.clone();
        let thread_gain = self.gain.clone();
        let handle = std::thread::spawn(move || {
            if let Err(e) = run_mic_test_thread(thread_running, thread_gain, app_handle) {
                tracing::error!("Mic test thread error: {}", e);
            }
        });

        *self.thread_handle.lock().unwrap() = Some(handle);
        Ok(())
    }

    fn stop(&self) -> Result<(), String> {
        if !self.is_running() {
            return Ok(());
        }

        self.running.store(false, Ordering::Relaxed);

        // Wait for thread to finish
        let handle = self.thread_handle.lock().unwrap().take();
        if let Some(h) = handle {
            let _ = h.join();
        }

        Ok(())
    }
}

fn run_mic_test_thread<R: tauri::Runtime>(
    running: Arc<AtomicBool>,
    gain: Arc<AtomicF32>,
    app_handle: tauri::AppHandle<R>,
) -> Result<(), String> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use ringbuf::traits::{Consumer, Producer, Split};
    use tauri::Emitter;

    let host = cpal::default_host();

    let input_device = host
        .default_input_device()
        .ok_or("No input device available")?;

    let output_device = host
        .default_output_device()
        .ok_or("No output device available")?;

    let config: cpal::StreamConfig = input_device
        .default_input_config()
        .map_err(|e| e.to_string())?
        .into();

    // Create ring buffer (1 second of audio)
    let buffer_size = config.sample_rate.0 as usize;
    let ring = ringbuf::HeapRb::<f32>::new(buffer_size);
    let (mut producer, mut consumer) = ring.split();

    // Pre-fill with silence to prevent underruns
    for _ in 0..(buffer_size / 4) {
        let _ = producer.try_push(0.0);
    }

    // Shared buffer for level calculation
    let level_buffer = Arc::new(std::sync::Mutex::new(Vec::<f32>::new()));
    let level_buffer_clone = level_buffer.clone();

    let producer_running = running.clone();
    let producer_gain = gain.clone();
    let input_stream = input_device
        .build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if !producer_running.load(Ordering::Relaxed) {
                    return;
                }

                // Read current gain value
                let current_gain = producer_gain.load(Ordering::Relaxed);

                for &sample in data {
                    let gained = sample * current_gain;
                    let _ = producer.try_push(gained);

                    // Store gained samples for level calculation
                    if let Ok(mut buffer) = level_buffer_clone.try_lock() {
                        buffer.push(gained);
                    }
                }
            },
            |err| tracing::error!("Input stream error: {}", err),
            None,
        )
        .map_err(|e| e.to_string())?;

    let consumer_running = running.clone();
    let output_stream = output_device
        .build_output_stream(
            &config,
            move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                if !consumer_running.load(Ordering::Relaxed) {
                    data.fill(0.0);
                    return;
                }
                for sample in data.iter_mut() {
                    *sample = consumer.try_pop().unwrap_or(0.0);
                }
            },
            |err| tracing::error!("Output stream error: {}", err),
            None,
        )
        .map_err(|e| e.to_string())?;

    input_stream.play().map_err(|e| e.to_string())?;
    output_stream.play().map_err(|e| e.to_string())?;

    // Keep streams alive and send level updates
    let mut last_emit = std::time::Instant::now();
    while running.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(50));

        // Calculate and emit level every 50ms
        if last_emit.elapsed() >= std::time::Duration::from_millis(50) {
            if let Ok(mut buffer) = level_buffer.lock() {
                if !buffer.is_empty() {
                    // Calculate RMS (Root Mean Square) level
                    let sum_squares: f32 = buffer.iter().map(|&s| s * s).sum();
                    let rms = (sum_squares / buffer.len() as f32).sqrt();

                    // Convert to dB scale (reference: 1.0 = 0dB)
                    let db = if rms > 0.0 {
                        20.0 * rms.log10()
                    } else {
                        -100.0 // Very quiet
                    };

                    // Normalize to 0.0-1.0 range for display
                    // -60dB to 0dB mapped to 0.0-1.0
                    let normalized = ((db + 60.0) / 60.0).clamp(0.0, 1.0);

                    // Emit event
                    let _ = app_handle.emit("mic-test-level", normalized);

                    buffer.clear();
                }
            }
            last_emit = std::time::Instant::now();
        }
    }

    // Clean shutdown
    drop(input_stream);
    drop(output_stream);

    Ok(())
}

static MIC_TEST_STATE: once_cell::sync::Lazy<MicTestState> =
    once_cell::sync::Lazy::new(MicTestState::new);

#[tauri::command]
#[specta::specta]
pub async fn start_mic_test<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    use tauri_plugin_db::DatabasePluginExt;

    // Try to get the gain from config, fallback to default
    let gain = async {
        let user_id = app.db_user_id().await.ok()??;
        let config = app.db_get_config(&user_id).await.ok()??;
        config.audio.post_mic_gain
    }
    .await
    .unwrap_or(1.5);

    MIC_TEST_STATE.start(gain, app)
}

#[tauri::command]
#[specta::specta]
pub async fn stop_mic_test<R: tauri::Runtime>(_app: tauri::AppHandle<R>) -> Result<(), String> {
    MIC_TEST_STATE.stop()
}

#[tauri::command]
#[specta::specta]
pub async fn get_mic_test_status<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    Ok(MIC_TEST_STATE.is_running())
}

#[tauri::command]
#[specta::specta]
pub async fn update_mic_test_gain<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    gain: f32,
) -> Result<(), String> {
    tracing::info!("update_mic_test_gain called with gain: {}", gain);
    if MIC_TEST_STATE.is_running() {
        MIC_TEST_STATE.set_gain(gain);
        tracing::info!("Gain updated successfully to: {}", gain);
        Ok(())
    } else {
        tracing::warn!("Attempted to update gain but mic test is not running");
        Err("Mic test is not running".to_string())
    }
}

// ============================================================================
// Microphone Calibration
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CalibrationResult {
    pub gain: f32,
    pub score: f32,
    pub word_count: usize,
    pub avg_confidence: f32,
    pub avg_db: f32,
}

const CALIBRATION_PHRASE: &str = "the quick brown fox jumps over the lazy dog";
const CALIBRATION_GAINS: [f32; 5] = [0.5, 1.0, 1.5, 2.0, 2.5];
const CALIBRATION_DURATION_SECS: u64 = 6;

/// Calculate text similarity using simple word matching
fn calculate_text_similarity(expected: &str, transcribed: &str) -> f32 {
    let expected_lower = expected.to_lowercase();
    let transcribed_lower = transcribed.to_lowercase();

    let expected_words: std::collections::HashSet<_> = expected_lower.split_whitespace().collect();

    let transcribed_words: std::collections::HashSet<_> =
        transcribed_lower.split_whitespace().collect();

    if expected_words.is_empty() {
        return 0.0;
    }

    let matches = expected_words.intersection(&transcribed_words).count();
    matches as f32 / expected_words.len() as f32
}

/// Scores a calibration result based on transcription quality
fn score_calibration(words: &[Word2], expected_text: &str) -> (f32, usize, f32, f32) {
    // Combine all transcribed words into a single string
    let transcribed_text = words
        .iter()
        .map(|w| w.text.as_str())
        .collect::<Vec<_>>()
        .join(" ");

    tracing::debug!("Expected: '{}', Got: '{}'", expected_text, transcribed_text);

    // Score 1: Text similarity (0-1, higher is better)
    let text_similarity = calculate_text_similarity(expected_text, &transcribed_text);

    // Score 2: Word count accuracy
    let expected_word_count = expected_text.split_whitespace().count();
    let word_count = words.len();
    let word_count_score = if expected_word_count > 0 {
        1.0 - ((word_count as f32 - expected_word_count as f32).abs() / expected_word_count as f32)
            .min(1.0)
    } else {
        0.0
    };

    // Score 3: Average confidence (0-1, higher is better)
    let avg_confidence = if !words.is_empty() {
        words.iter().filter_map(|w| w.confidence).sum::<f32>() / (words.len() as f32)
    } else {
        0.0
    };

    // Combined score: heavily weighted towards text similarity
    let combined_score = text_similarity * 0.6 + word_count_score * 0.2 + avg_confidence * 0.2;

    (combined_score, word_count, avg_confidence, text_similarity)
}

#[tauri::command]
#[specta::specta]
pub async fn calibrate_microphone<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<CalibrationResult, String> {
    use tauri::Listener;

    tracing::info!("Starting microphone calibration");

    // Store original gain to restore if needed
    let original_gain = get_audio_gains(app.clone())
        .await
        .map_err(|e| e.to_string())?
        .post_mic_gain;

    tracing::info!("Original gain: {}", original_gain);

    let mut best_result: Option<CalibrationResult> = None;

    for (step, &gain) in CALIBRATION_GAINS.iter().enumerate() {
        tracing::info!(
            "Testing gain level: {}x (step {}/{})",
            gain,
            step + 1,
            CALIBRATION_GAINS.len()
        );

        // Set the gain for this test
        let mut gains = get_audio_gains(app.clone())
            .await
            .map_err(|e| e.to_string())?;
        gains.post_mic_gain = gain;
        set_audio_gains(app.clone(), gains)
            .await
            .map_err(|e| e.to_string())?;

        // Emit progress event
        let progress = CalibrationProgressEvent {
            current_gain: gain,
            current_step: step + 1,
            total_steps: CALIBRATION_GAINS.len(),
            message: format!(
                "Testing gain {}x - Please read: '{}'",
                gain, CALIBRATION_PHRASE
            ),
        };
        progress.emit(&app).map_err(|e| e.to_string())?;

        // Create a channel to collect transcription words
        let (tx, rx) = std::sync::mpsc::channel::<Vec<Word2>>();

        // Create a unique session ID for this calibration test
        let session_id = format!("calibration-{}-{}", gain, chrono::Utc::now().timestamp());

        // Listen for transcription events
        let _listener = app.listen("plugin:listener:session-event", move |event| {
            if let Ok(session_event) = serde_json::from_str::<crate::SessionEvent>(&event.payload())
            {
                if let crate::SessionEvent::Words { words } = session_event {
                    tracing::debug!("Received {} words during calibration", words.len());
                    let _ = tx.send(words);
                }
            }
        });

        // Start recording session
        app.start_session(session_id.clone()).await;

        // Wait for user to speak
        tokio::time::sleep(tokio::time::Duration::from_secs(CALIBRATION_DURATION_SECS)).await;

        // Stop recording
        app.stop_session().await;

        // Small delay to ensure final transcription arrives
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // Collect all transcribed words
        let mut all_words = Vec::new();
        while let Ok(words) = rx.try_recv() {
            all_words.extend(words);
        }

        tracing::info!(
            "Collected {} total words for gain {}",
            all_words.len(),
            gain
        );

        let (score, word_count, avg_confidence, text_similarity) =
            score_calibration(&all_words, CALIBRATION_PHRASE);

        tracing::info!(
            "Gain {}: score={:.2}, words={}, similarity={:.2}, confidence={:.2}",
            gain,
            score,
            word_count,
            text_similarity,
            avg_confidence
        );

        let result = CalibrationResult {
            gain,
            score,
            word_count,
            avg_confidence,
            avg_db: text_similarity, // Reusing avg_db field for text similarity
        };

        // Update best result if this is better
        if best_result.is_none() || score > best_result.as_ref().unwrap().score {
            best_result = Some(result.clone());
        }

        // Short pause between tests
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    let best = best_result.ok_or("Calibration failed: no valid results")?;
    tracing::info!(
        "Calibration complete. Best gain: {}x (score: {:.2})",
        best.gain,
        best.score
    );

    Ok(best)
}
