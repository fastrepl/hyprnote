use statig::prelude::*;
use std::time::{Duration, Instant};

use tauri::Manager;
use tauri_specta::Event;

use futures_util::StreamExt;
use tokio::task::JoinSet;

use hypr_audio::AsyncSource;

use crate::{manager::TranscriptManager, SessionEvent};

const SAMPLE_RATE: u32 = 16000;
const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(60 * 15);

const WAV_SPEC: hound::WavSpec = hound::WavSpec {
    channels: 1,
    sample_rate: SAMPLE_RATE,
    bits_per_sample: 32,
    sample_format: hound::SampleFormat::Float,
};

struct AudioSaver;

impl AudioSaver {
    async fn save_to_wav(
        rx: flume::Receiver<Vec<f32>>,
        session_id: &str,
        app_dir: &std::path::Path,
        filename: &str,
        append: bool,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let dir = app_dir.join(session_id);
        std::fs::create_dir_all(&dir)?;
        let path = dir.join(filename);

        let mut wav = if append && path.exists() {
            hound::WavWriter::append(path)?
        } else {
            hound::WavWriter::create(path, WAV_SPEC)?
        };

        while let Ok(chunk) = rx.recv_async().await {
            for sample in chunk {
                wav.write_sample(sample)?;
            }
        }

        wav.finalize()?;
        Ok(())
    }
}

struct AudioChannels {
    mic_tx: flume::Sender<Vec<f32>>,
    mic_rx: flume::Receiver<Vec<f32>>,
    speaker_tx: flume::Sender<Vec<f32>>,
    speaker_rx: flume::Receiver<Vec<f32>>,
    save_mixed_tx: flume::Sender<Vec<f32>>,
    save_mixed_rx: flume::Receiver<Vec<f32>>,
    save_mic_raw_tx: Option<flume::Sender<Vec<f32>>>,
    save_mic_raw_rx: Option<flume::Receiver<Vec<f32>>>,
    save_speaker_raw_tx: Option<flume::Sender<Vec<f32>>>,
    save_speaker_raw_rx: Option<flume::Receiver<Vec<f32>>>,
    process_mic_tx: flume::Sender<Vec<f32>>,
    process_mic_rx: flume::Receiver<Vec<f32>>,
    process_speaker_tx: flume::Sender<Vec<f32>>,
    process_speaker_rx: flume::Receiver<Vec<f32>>,
}

impl AudioChannels {
    fn new() -> Self {
        const CHUNK_BUFFER_SIZE: usize = 64;

        let (mic_tx, mic_rx) = flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);
        let (speaker_tx, speaker_rx) = flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);
        let (save_mixed_tx, save_mixed_rx) = flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);
        let (process_mic_tx, process_mic_rx) = flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);
        let (process_speaker_tx, process_speaker_rx) =
            flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);

        let (save_mic_raw_tx, save_mic_raw_rx) = if cfg!(debug_assertions) {
            let (tx, rx) = flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);
            (Some(tx), Some(rx))
        } else {
            (None, None)
        };

        let (save_speaker_raw_tx, save_speaker_raw_rx) = if cfg!(debug_assertions) {
            let (tx, rx) = flume::bounded::<Vec<f32>>(CHUNK_BUFFER_SIZE);
            (Some(tx), Some(rx))
        } else {
            (None, None)
        };

        Self {
            mic_tx,
            mic_rx,
            speaker_tx,
            speaker_rx,
            save_mixed_tx,
            save_mixed_rx,
            save_mic_raw_tx,
            save_mic_raw_rx,
            save_speaker_raw_tx,
            save_speaker_raw_rx,
            process_mic_tx,
            process_mic_rx,
            process_speaker_tx,
            process_speaker_rx,
        }
    }

    async fn process_mic_stream(
        mut mic_stream: impl futures_util::Stream<Item = Vec<f32>> + Unpin,
        mic_muted_rx: tokio::sync::watch::Receiver<bool>,
        mic_tx: flume::Sender<Vec<f32>>,
    ) {
        let mut is_muted = *mic_muted_rx.borrow();
        let watch_rx = mic_muted_rx.clone();

        while let Some(actual) = mic_stream.next().await {
            if watch_rx.has_changed().unwrap_or(false) {
                is_muted = *watch_rx.borrow();
            }

            let maybe_muted = if is_muted {
                vec![0.0; actual.len()]
            } else {
                actual
            };

            if let Err(e) = mic_tx.send_async(maybe_muted).await {
                tracing::error!("mic_tx_send_error: {:?}", e);
                break;
            }
        }
    }

    async fn process_speaker_stream(
        mut speaker_stream: impl futures_util::Stream<Item = Vec<f32>> + Unpin,
        speaker_muted_rx: tokio::sync::watch::Receiver<bool>,
        speaker_tx: flume::Sender<Vec<f32>>,
    ) {
        let mut is_muted = *speaker_muted_rx.borrow();
        let watch_rx = speaker_muted_rx.clone();

        while let Some(actual) = speaker_stream.next().await {
            if watch_rx.has_changed().unwrap_or(false) {
                is_muted = *watch_rx.borrow();
            }

            let maybe_muted = if is_muted {
                vec![0.0; actual.len()]
            } else {
                actual
            };

            if let Err(e) = speaker_tx.send_async(maybe_muted).await {
                tracing::error!("speaker_tx_send_error: {:?}", e);
                break;
            }
        }
    }
}

pub struct Session {
    app: tauri::AppHandle,
    session_id: Option<String>,
    mic_device_name: Option<String>,
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
        let mic_device_name = hypr_audio::AudioInput::get_default_mic_device_name();

        Self {
            app,
            session_id: None,
            mic_device_name: Some(mic_device_name),
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

        let session_id = id.into();
        let onboarding_session_id = self.app.db_onboarding_session_id().await?;

        let user_id = self.app.db_user_id().await?.unwrap();
        self.session_id = Some(session_id.clone());

        let (record, languages) = {
            let config = self.app.db_get_config(&user_id).await?;

            let record = config
                .as_ref()
                .is_none_or(|c| c.general.save_recordings.unwrap_or(true));

            let languages = config.as_ref().map_or_else(
                || vec![hypr_language::ISO639::En.into()],
                |c| c.general.spoken_languages.clone(),
            );

            (record, languages)
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

        let listen_client =
            setup_listen_client(&self.app, languages, session_id == onboarding_session_id).await?;
        let mic_sample_stream = {
            let mut input = hypr_audio::AudioInput::from_mic(self.mic_device_name.clone())?;
            input.stream()
        };
        let mic_stream = mic_sample_stream
            .resample(SAMPLE_RATE)
            .chunks(hypr_aec::BLOCK_SIZE);

        // https://github.com/fastrepl/hyprnote/commit/7c8cf1c
        tokio::time::sleep(Duration::from_millis(65)).await;
        // We need some delay here for Airpod transition.
        // But if the delay is too long, AEC will not work.

        let speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
        let speaker_stream = speaker_sample_stream
            .resample(SAMPLE_RATE)
            .chunks(hypr_aec::BLOCK_SIZE);

        let channels = AudioChannels::new();

        {
            let silence_stream_tx = hypr_audio::AudioOutput::silence();
            self.silence_stream_tx = Some(silence_stream_tx);
        }

        let mut tasks = JoinSet::new();

        tasks.spawn(AudioChannels::process_mic_stream(
            mic_stream,
            mic_muted_rx_main.clone(),
            channels.mic_tx.clone(),
        ));

        tasks.spawn(AudioChannels::process_speaker_stream(
            speaker_stream,
            speaker_muted_rx_main.clone(),
            channels.speaker_tx.clone(),
        ));

        let app_dir = self.app.path().app_data_dir().unwrap();

        tasks.spawn({
            let app = self.app.clone();
            let mic_rx = channels.mic_rx.clone();
            let speaker_rx = channels.speaker_rx.clone();
            let save_mixed_tx = channels.save_mixed_tx.clone();
            let save_mic_raw_tx = channels.save_mic_raw_tx.clone();
            let save_speaker_raw_tx = channels.save_speaker_raw_tx.clone();
            let process_mic_tx = channels.process_mic_tx.clone();
            let process_speaker_tx = channels.process_speaker_tx.clone();

            async move {
                let mut aec = hypr_aec::AEC::new().unwrap();
                let mut mic_agc = hypr_agc::Agc::default();
                let mut speaker_agc = hypr_agc::Agc::default();
                let mut last_broadcast = Instant::now();

                loop {
                    let (mut mic_chunk_raw, mut speaker_chunk): (Vec<f32>, Vec<f32>) =
                        match tokio::join!(mic_rx.recv_async(), speaker_rx.recv_async()) {
                            (Ok(mic), Ok(speaker)) => (mic, speaker),
                            _ => break,
                        };

                    mic_agc.process(&mut mic_chunk_raw);
                    speaker_agc.process(&mut speaker_chunk);

                    let maybe_mic_chunk = aec.process_streaming(&mic_chunk_raw, &speaker_chunk);

                    let mic_chunk = match maybe_mic_chunk {
                        Ok(mic_chunk) => mic_chunk,
                        Err(e) => {
                            tracing::error!("aec_error: {:?}", e);
                            mic_chunk_raw.clone()
                        }
                    };

                    if matches!(*session_state_rx.borrow(), State::RunningPaused {}) {
                        let mut rx = session_state_rx.clone();
                        let _ = rx.changed().await;
                        continue;
                    }

                    let processed_mic = mic_chunk.clone();
                    let processed_speaker = speaker_chunk.clone();

                    let now = Instant::now();
                    if now.duration_since(last_broadcast) >= AUDIO_AMPLITUDE_THROTTLE {
                        if let Err(e) = SessionEvent::from((&mic_chunk, &speaker_chunk)).emit(&app)
                        {
                            tracing::error!("broadcast_error: {:?}", e);
                        }
                        last_broadcast = now;
                    }

                    if let Some(ref tx) = save_mic_raw_tx {
                        let _ = tx.send_async(mic_chunk_raw.clone()).await;
                    }
                    if let Some(ref tx) = save_speaker_raw_tx {
                        let _ = tx.send_async(speaker_chunk.clone()).await;
                    }

                    if let Err(_) = process_mic_tx.send_async(processed_mic).await {
                        tracing::error!("process_mic_tx_send_error");
                        return;
                    }
                    if let Err(_) = process_speaker_tx.send_async(processed_speaker).await {
                        tracing::error!("process_speaker_tx_send_error");
                        return;
                    }

                    if record {
                        let mixed: Vec<f32> = mic_chunk
                            .iter()
                            .zip(speaker_chunk.iter())
                            .map(|(mic, speaker)| (mic + speaker).clamp(-1.0, 1.0))
                            .collect();
                        if save_mixed_tx.send_async(mixed).await.is_err() {
                            tracing::error!("save_mixed_tx_send_error");
                        }
                    }
                }
            }
        });

        if record {
            tasks.spawn({
                let app_dir = app_dir.clone();
                let session_id = session_id.clone();
                let save_mixed_rx = channels.save_mixed_rx.clone();

                async move {
                    if let Err(e) = AudioSaver::save_to_wav(
                        save_mixed_rx,
                        &session_id,
                        &app_dir,
                        "audio.wav",
                        true,
                    )
                    .await
                    {
                        tracing::error!("failed_to_save_mixed_audio: {:?}", e);
                    }
                }
            });
        }

        if let Some(save_mic_raw_rx) = channels.save_mic_raw_rx.clone() {
            tasks.spawn({
                let session_id = session_id.clone();
                let app_dir = app_dir.clone();

                async move {
                    if let Err(e) = AudioSaver::save_to_wav(
                        save_mic_raw_rx,
                        &session_id,
                        &app_dir,
                        "audio_mic.wav",
                        false,
                    )
                    .await
                    {
                        tracing::error!("failed_to_save_raw_mic_audio: {:?}", e);
                    }
                }
            });
        }

        if let Some(save_speaker_raw_rx) = channels.save_speaker_raw_rx.clone() {
            tasks.spawn({
                let session_id = session_id.clone();
                let app_dir = app_dir.clone();

                async move {
                    if let Err(e) = AudioSaver::save_to_wav(
                        save_speaker_raw_rx,
                        &session_id,
                        &app_dir,
                        "audio_speaker.wav",
                        false,
                    )
                    .await
                    {
                        tracing::error!("failed_to_save_raw_speaker_audio: {:?}", e);
                    }
                }
            });
        }

        let mic_audio_stream = channels
            .process_mic_rx
            .into_stream()
            .map(|v| hypr_audio_utils::f32_to_i16_bytes(v.into_iter()));

        let speaker_audio_stream = channels
            .process_speaker_rx
            .into_stream()
            .map(|v| hypr_audio_utils::f32_to_i16_bytes(v.into_iter()));

        tasks.spawn({
            let app = self.app.clone();
            let stop_tx = stop_tx.clone();

            async move {
                let listen_stream = listen_client
                    .from_realtime_audio(mic_audio_stream, speaker_audio_stream)
                    .await
                    .unwrap();

                futures_util::pin_mut!(listen_stream);

                let mut manager = TranscriptManager::default();

                loop {
                    match tokio::time::timeout(LISTEN_STREAM_TIMEOUT, listen_stream.next()).await {
                        Ok(Some(response)) => {
                            let diff = manager.append(response.clone());

                            let partial_words = diff
                                .partial_words
                                .iter()
                                .map(|w| owhisper_interface::Word2::from(w.clone()))
                                .collect::<Vec<_>>();

                            SessionEvent::PartialWords {
                                words: partial_words,
                            }
                            .emit(&app)
                            .unwrap();

                            let final_words = diff
                                .final_words
                                .iter()
                                .map(|w| owhisper_interface::Word2::from(w.clone()))
                                .collect::<Vec<_>>();

                            update_session(&app, &session.id, final_words.clone())
                                .await
                                .unwrap();

                            SessionEvent::FinalWords { words: final_words }
                                .emit(&app)
                                .unwrap();
                        }
                        Ok(None) => {
                            tracing::info!("listen_stream_ended");

                            // TODO: this not work - session still on ACTIVE
                            if stop_tx.send(()).await.is_err() {
                                tracing::warn!("failed_to_send_stop_signal");
                            }
                            break;
                        }
                        Err(_) => {
                            tracing::info!("listen_stream_timeout");

                            if let Some(state) = app.try_state::<crate::SharedState>() {
                                let mut guard = state.lock().await;
                                guard.fsm.handle(&crate::fsm::StateEvent::Pause).await;
                            }
                        }
                    }
                }
            }
        });

        let app_handle = self.app.clone();
        tasks.spawn(async move {
            if stop_rx.recv().await.is_some() {
                if let Some(state) = app_handle.try_state::<crate::SharedState>() {
                    let mut guard = state.lock().await;
                    guard.fsm.handle(&crate::fsm::StateEvent::Stop).await;
                }
            }
        });

        self.tasks = Some(tasks);

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

    pub fn get_available_mic_devices() -> Vec<String> {
        hypr_audio::AudioInput::list_mic_devices()
    }

    pub fn get_current_mic_device(&self) -> Option<String> {
        self.mic_device_name.clone()
    }
}

async fn setup_listen_client<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    languages: Vec<hypr_language::Language>,
    is_onboarding: bool,
) -> Result<owhisper_client::ListenClientDual, crate::Error> {
    let conn = {
        use tauri_plugin_local_stt::LocalSttPluginExt;
        app.get_connection().await?
    };

    Ok(owhisper_client::ListenClient::builder()
        .api_base(conn.base_url)
        .api_key(conn.api_key.unwrap_or_default())
        .params(owhisper_interface::ListenParams {
            languages,
            redemption_time_ms: Some(if is_onboarding { 70 } else { 500 }),
            ..Default::default()
        })
        .build_dual())
}

async fn update_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session_id: impl Into<String>,
    words: Vec<owhisper_interface::Word2>,
) -> Result<Vec<owhisper_interface::Word2>, crate::Error> {
    use tauri_plugin_db::DatabasePluginExt;

    // TODO: not ideal. We might want to only do "update" everywhere instead of upserts.
    // We do this because it is highly likely that the session fetched in the listener is stale (session can be updated on the React side).
    let mut session = app
        .db_get_session(session_id)
        .await?
        .ok_or(crate::Error::NoneSession)?;

    session.words.extend(words);
    app.db_upsert_session(session.clone()).await.unwrap();

    Ok(session.words)
}

pub enum StateEvent {
    Start(String),
    Stop,
    Pause,
    Resume,
    MicMuted(bool),
    SpeakerMuted(bool),
    MicChange(Option<String>),
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
            StateEvent::MicChange(device_name) => {
                self.mic_device_name = device_name.clone();

                if self.session_id.is_some() && self.tasks.is_some() {
                    if let Some(session_id) = self.session_id.clone() {
                        self.teardown_resources().await;
                        self.setup_resources(&session_id).await.unwrap();
                    }
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
        // {
        //     use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
        //     let _ = self.app.window_show(HyprWindow::Control);
        // }

        if let Some(session_id) = &self.session_id {
            use tauri_plugin_db::DatabasePluginExt;

            if let Ok(Some(mut session)) = self.app.db_get_session(session_id).await {
                session.record_start = Some(chrono::Utc::now());
                let _ = self.app.db_upsert_session(session).await;
            }
        }
    }

    fn on_transition(&mut self, source: &State, target: &State) {
        #[cfg(debug_assertions)]
        tracing::info!("transitioned from `{:?}` to `{:?}`", source, target);

        match target {
            State::RunningActive {} => SessionEvent::RunningActive {}.emit(&self.app).unwrap(),
            State::RunningPaused {} => SessionEvent::RunningPaused {}.emit(&self.app).unwrap(),
            State::Inactive {} => SessionEvent::Inactive {}.emit(&self.app).unwrap(),
        }

        if let Some(tx) = &self.session_state_tx {
            let _ = tx.send(target.clone());
        }
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
