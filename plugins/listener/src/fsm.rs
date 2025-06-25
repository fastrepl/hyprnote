use std::time::{Duration, Instant};

use statig::prelude::*;

use tauri::Manager;
use tauri_specta::Event;

use futures_util::StreamExt;
use tokio::task::JoinSet;

use hypr_audio::AsyncSource;

use crate::SessionEvent;

const SAMPLE_RATE: u32 = 16000;
const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

const WAV_SPEC: hound::WavSpec = hound::WavSpec {
    channels: 1,
    sample_rate: SAMPLE_RATE,
    bits_per_sample: 32,
    sample_format: hound::SampleFormat::Float,
};

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
            let mut input = hypr_audio::AudioInput::from_mic();
            input.stream()
        };
        let mut mic_stream = mic_sample_stream.resample(SAMPLE_RATE).chunks(1024);
        tokio::time::sleep(Duration::from_millis(100)).await;

        let speaker_sample_stream = hypr_audio::AudioInput::from_speaker(None).stream();
        let mut speaker_stream = speaker_sample_stream.resample(SAMPLE_RATE).chunks(1024);

        let chunk_buffer_size: usize = 1024;
        let sample_buffer_size = (SAMPLE_RATE as usize) * 60 * 10;

        let (mic_tx, mic_rx) = flume::bounded::<Vec<f32>>(chunk_buffer_size);
        let (speaker_tx, speaker_rx) = flume::bounded::<Vec<f32>>(chunk_buffer_size);

        let (save_mixed_tx, save_mixed_rx) = flume::bounded::<f32>(sample_buffer_size);
        let (save_mic_raw_tx, save_mic_raw_rx) = if cfg!(debug_assertions) && record {
            let (tx, rx) = flume::bounded::<f32>(sample_buffer_size);
            (Some(tx), Some(rx))
        } else {
            (None, None)
        };
        let (save_speaker_raw_tx, save_speaker_raw_rx) = if cfg!(debug_assertions) && record {
            let (tx, rx) = flume::bounded::<f32>(sample_buffer_size);
            (Some(tx), Some(rx))
        } else {
            (None, None)
        };

        let (process_tx, process_rx) = flume::bounded::<f32>(sample_buffer_size);

        {
            let silence_stream_tx = hypr_audio::AudioOutput::silence();
            self.silence_stream_tx = Some(silence_stream_tx);
        }

        let mut tasks = JoinSet::new();

        tasks.spawn({
            let mic_muted_rx = mic_muted_rx_main.clone();
            async move {
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
        });

        tasks.spawn({
            let speaker_muted_rx = speaker_muted_rx_main.clone();
            async move {
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
        });

        let app_dir = self.app.path().app_data_dir().unwrap();

        tasks.spawn({
            let app = self.app.clone();
            let save_mixed_tx = save_mixed_tx.clone();

            async move {
                let mut last_broadcast = Instant::now();

                loop {
                    let (mic_chunk, speaker_chunk) =
                        match tokio::join!(mic_rx.recv_async(), speaker_rx.recv_async()) {
                            (Ok(mic), Ok(speaker)) => (mic, speaker),
                            _ => break,
                        };

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

                    if let Some(ref tx) = save_mic_raw_tx {
                        for &sample in &mic_chunk {
                            let _ = tx.send_async(sample).await;
                        }
                    }
                    if let Some(ref tx) = save_speaker_raw_tx {
                        for &sample in &speaker_chunk {
                            let _ = tx.send_async(sample).await;
                        }
                    }

                    let mixed: Vec<f32> = mic_chunk
                        .into_iter()
                        .zip(speaker_chunk.into_iter())
                        .map(|(a, b)| (a + b).clamp(-1.0, 1.0))
                        .collect();

                    for &sample in &mixed {
                        if process_tx.send_async(sample).await.is_err() {
                            tracing::error!("process_tx_send_error");
                            return;
                        }

                        if record {
                            if save_mixed_tx.send_async(sample).await.is_err() {
                                tracing::error!("save_mixed_tx_send_error");
                            }
                        }
                    }
                }
            }
        });

        if record {
            tasks.spawn({
                let app_dir = app_dir.clone();
                let session_id = session_id.clone();

                async move {
                    let dir = app_dir.join(&session_id);
                    std::fs::create_dir_all(&dir).unwrap();
                    let path = dir.join("audio.wav");

                    let mut wav = if path.exists() {
                        hound::WavWriter::append(path).unwrap()
                    } else {
                        hound::WavWriter::create(path, WAV_SPEC).unwrap()
                    };

                    while let Ok(sample) = save_mixed_rx.recv_async().await {
                        wav.write_sample(sample).unwrap();
                        wav.write_sample(sample).unwrap();
                    }

                    wav.finalize().unwrap();
                }
            });
        }

        if let Some(save_mic_raw_rx) = save_mic_raw_rx {
            tasks.spawn({
                let session_id = session_id.clone();
                let app_dir = app_dir.clone();

                async move {
                    let dir = app_dir.join(&session_id);
                    std::fs::create_dir_all(&dir).unwrap();
                    let path = dir.join("audio_mic.wav");

                    let mut wav = hound::WavWriter::create(path, WAV_SPEC).unwrap();

                    while let Ok(sample) = save_mic_raw_rx.recv_async().await {
                        wav.write_sample(sample).unwrap();
                    }

                    wav.finalize().unwrap();
                }
            });
        }

        if let Some(save_speaker_raw_rx) = save_speaker_raw_rx {
            tasks.spawn({
                let session_id = session_id.clone();
                let app_dir = app_dir.clone();

                async move {
                    let dir = app_dir.join(&session_id);
                    std::fs::create_dir_all(&dir).unwrap();
                    let path = dir.join("audio_speaker.wav");

                    let mut wav = hound::WavWriter::create(path, WAV_SPEC).unwrap();

                    while let Ok(sample) = save_speaker_raw_rx.recv_async().await {
                        wav.write_sample(sample).unwrap();
                    }

                    wav.finalize().unwrap();
                }
            });
        }

        let audio_stream = hypr_audio::StreamSource::new(process_rx.into_stream(), SAMPLE_RATE);

        let listen_stream = listen_client.from_audio(audio_stream).await?;

        tasks.spawn({
            let app = self.app.clone();
            let stop_tx = stop_tx.clone();

            async move {
                futures_util::pin_mut!(listen_stream);

                while let Some(result) = listen_stream.next().await {
                    // We don't have to do this, and inefficient. But this is what works at the moment.
                    {
                        let updated_words = update_session(&app, &session.id, result.words)
                            .await
                            .unwrap();

                        SessionEvent::Words {
                            words: updated_words,
                        }
                        .emit(&app)
                    }
                    .unwrap();
                }

                tracing::info!("listen_stream_ended");
                if stop_tx.send(()).await.is_err() {
                    tracing::warn!("failed_to_send_stop_signal");
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
}

async fn setup_listen_client<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    language: hypr_language::Language,
    _jargons: Vec<String>,
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

    // let static_prompt = format!(
    //     "{} / {}:",
    //     jargons.join(", "),
    //     language
    //         .text_transcript()
    //         .unwrap_or("transcript".to_string())
    // );
    let static_prompt = "".to_string();

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
