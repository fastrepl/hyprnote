use std::collections::HashMap;
use std::sync::Arc;

use statig::prelude::*;
use tauri::{ipc::Channel, Manager};

use futures_util::StreamExt;
use tokio::sync::{mpsc, Mutex};

use crate::{SessionEvent, SessionEventStarted, SessionEventTimelineView};
use hypr_audio::AsyncSource;
use hypr_timeline::{Timeline, TimelineFilter};

const SAMPLE_RATE: u32 = 16000;

pub struct Session {
    app: tauri::AppHandle,
    channels: Arc<Mutex<HashMap<u32, Channel<SessionEvent>>>>,
    mic_muted_tx: Option<tokio::sync::watch::Sender<bool>>,
    speaker_muted_tx: Option<tokio::sync::watch::Sender<bool>>,
    silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    mic_stream_handle: Option<tokio::task::JoinHandle<()>>,
    speaker_stream_handle: Option<tokio::task::JoinHandle<()>>,
    listen_stream_handle: Option<tokio::task::JoinHandle<()>>,
}

impl Session {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self {
            app,
            channels: Arc::new(Mutex::new(HashMap::new())),
            mic_muted_tx: None,
            speaker_muted_tx: None,
            silence_stream_tx: None,
            mic_stream_handle: None,
            speaker_stream_handle: None,
            listen_stream_handle: None,
        }
    }

    async fn broadcast(
        channels: &Arc<Mutex<HashMap<u32, Channel<SessionEvent>>>>,
        event: SessionEvent,
    ) -> Result<(), crate::Error> {
        let guard = channels.lock().await;
        for (_id, channel) in guard.iter() {
            let _ = channel.send(event.clone());
        }

        Ok(())
    }

    async fn setup_resources(&mut self, id: impl Into<String>) -> Result<(), crate::Error> {
        use tauri_plugin_db::DatabasePluginExt;

        let user_id = self.app.db_user_id().await?.unwrap();
        let session_id = id.into();
        let mut session = {
            self.app
                .db_get_session(&session_id)
                .await?
                .ok_or(crate::Error::NoneSession)?
        };

        let jargons = match self.app.db_get_config(&user_id).await? {
            Some(config) => config.general.jargons,
            None => vec![],
        };

        let (mic_muted_tx, mic_muted_rx) = tokio::sync::watch::channel(false);
        let (speaker_muted_tx, speaker_muted_rx) = tokio::sync::watch::channel(false);

        self.mic_muted_tx = Some(mic_muted_tx);
        self.speaker_muted_tx = Some(speaker_muted_tx);

        let listen_client = setup_listen_client(&self.app, jargons).await?;

        let mic_sample_stream = {
            let mut input = hypr_audio::AudioInput::from_mic();
            input.stream()
        };
        let mic_sample_rate = mic_sample_stream.sample_rate();
        let mut mic_stream = mic_sample_stream.resample(SAMPLE_RATE).chunks(1024);

        let speaker_sample_stream =
            hypr_audio::AudioInput::from_speaker(Some(mic_sample_rate)).stream();
        let mut speaker_stream = speaker_sample_stream.resample(SAMPLE_RATE).chunks(1024);

        let chunk_buffer_size: usize = 1024;
        let sample_buffer_size = (SAMPLE_RATE as usize) * 60 * 10;

        let (mic_tx, mut mic_rx) = mpsc::channel::<Vec<f32>>(chunk_buffer_size);
        let (speaker_tx, mut speaker_rx) = mpsc::channel::<Vec<f32>>(chunk_buffer_size);
        let (mixed_tx, mixed_rx) = mpsc::channel::<f32>(sample_buffer_size);

        {
            let silence_stream_tx = hypr_audio::AudioOutput::silence();
            self.silence_stream_tx = Some(silence_stream_tx);
        }

        self.mic_stream_handle = Some(tokio::spawn({
            async move {
                while let Some(actual) = mic_stream.next().await {
                    let maybe_muted = if *mic_muted_rx.borrow() {
                        vec![0.0; actual.len()]
                    } else {
                        actual
                    };

                    if let Err(e) = mic_tx.send(maybe_muted).await {
                        tracing::error!("mic_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        }));

        self.speaker_stream_handle = Some(tokio::spawn({
            async move {
                while let Some(actual) = speaker_stream.next().await {
                    let maybe_muted = if *speaker_muted_rx.borrow() {
                        vec![0.0; actual.len()]
                    } else {
                        actual
                    };

                    if let Err(e) = speaker_tx.send(maybe_muted).await {
                        tracing::error!("speaker_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        }));

        let app_dir = self.app.path().app_data_dir().unwrap();
        let channels = self.channels.clone();

        tokio::spawn(async move {
            let dir = app_dir.join(session_id);
            std::fs::create_dir_all(&dir).unwrap();
            let path = dir.join("audio.wav");

            let wav_spec = hound::WavSpec {
                channels: 1,
                sample_rate: SAMPLE_RATE,
                bits_per_sample: 32,
                sample_format: hound::SampleFormat::Float,
            };

            let mut wav = if path.exists() {
                hound::WavWriter::append(path).unwrap()
            } else {
                hound::WavWriter::create(path, wav_spec).unwrap()
            };

            let start_event = SessionEvent::Started(SessionEventStarted {
                seconds: wav.duration() as f32 / SAMPLE_RATE as f32,
            });
            Session::broadcast(&channels, start_event).await.unwrap();

            while let (Some(mic_chunk), Some(speaker_chunk)) =
                (mic_rx.recv().await, speaker_rx.recv().await)
            {
                let event = crate::SessionEventAudioAmplitude::from((&mic_chunk, &speaker_chunk));

                Session::broadcast(&channels, SessionEvent::AudioAmplitude(event))
                    .await
                    .unwrap();

                let mixed: Vec<f32> = mic_chunk
                    .into_iter()
                    .zip(speaker_chunk.into_iter())
                    .map(|(a, b)| (a + b).clamp(-1.0, 1.0))
                    .collect();

                for &sample in &mixed {
                    wav.write_sample(sample).unwrap();
                    mixed_tx.send(sample).await.unwrap();
                }
            }

            wav.finalize().unwrap();
        });

        let timeline = Arc::new(Mutex::new(Timeline::default()));
        let audio_stream = hypr_audio::ReceiverStreamSource::new(mixed_rx, SAMPLE_RATE);

        let listen_stream = listen_client.from_audio(audio_stream).await?;
        let channels = self.channels.clone();

        self.listen_stream_handle = Some(tokio::spawn({
            let app = self.app.clone();
            let timeline = timeline.clone();

            async move {
                futures_util::pin_mut!(listen_stream);

                while let Some(result) = listen_stream.next().await {
                    let mut timeline = timeline.lock().await;

                    match result {
                        crate::ListenOutputChunk::Transcribe(chunk) => {
                            update_session(&app, &mut session, chunk.clone())
                                .await
                                .unwrap();

                            timeline.add_transcription(chunk);
                        }
                        crate::ListenOutputChunk::Diarize(chunk) => {
                            timeline.add_diarization(chunk);
                        }
                    }

                    Session::broadcast(
                        &channels,
                        SessionEvent::TimelineView(SessionEventTimelineView {
                            timeline: timeline.view(TimelineFilter::default()),
                        }),
                    )
                    .await
                    .unwrap();
                }

                Session::broadcast(&channels, SessionEvent::Stopped)
                    .await
                    .unwrap();
            }
        }));

        Ok(())
    }

    async fn teardown_resources(&mut self) {
        if let Some(tx) = self.silence_stream_tx.take() {
            let _ = tx.send(());
        }

        if let Some(handle) = self.mic_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }

        if let Some(handle) = self.speaker_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }

        if let Some(handle) = self.listen_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }

        let mut channels = self.channels.lock().await;
        channels.clear();
    }
}

async fn setup_listen_client<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    jargons: Vec<String>,
) -> Result<crate::client::ListenClient, crate::Error> {
    let api_base = {
        use tauri_plugin_connector::ConnectorPluginExt;
        app.get_api_base(tauri_plugin_connector::ConnectionType::AutoSTT)
            .await
            .ok_or(crate::Error::NoSTTConnection)?
    };

    let api_key = {
        use tauri_plugin_auth::AuthPluginExt;
        app.get_from_vault(tauri_plugin_auth::VaultKey::RemoteServer)
            .unwrap_or_default()
            .unwrap_or_default()
    };

    tracing::info!(api_base = ?api_base, api_key = ?api_key, "listen_client");

    Ok(crate::client::ListenClient::builder()
        .api_base(api_base)
        .api_key(api_key)
        .params(hypr_listener_interface::ListenParams {
            language: codes_iso_639::part_1::LanguageCode::En,
            static_prompt: jargons.join(", "),
            ..Default::default()
        })
        .build())
}

async fn update_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session: &mut hypr_db_user::Session,
    transcript: hypr_listener_interface::TranscriptChunk,
) -> Result<(), crate::Error> {
    session.conversations.push(hypr_db_user::ConversationChunk {
        transcripts: vec![transcript],
        diarizations: vec![],
        start: chrono::Utc::now(),
        end: chrono::Utc::now(),
    });

    {
        use tauri_plugin_db::DatabasePluginExt;
        app.db_upsert_session(session.clone()).await.unwrap();
    }

    Ok(())
}

pub enum Event {
    Start(String),
    Stop,
    Pause,
    Resume,
    Subscribe(Channel<SessionEvent>),
    Unsubscribe(Channel<SessionEvent>),
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
    async fn common(&mut self, event: &Event) -> Response<State> {
        match event {
            Event::Subscribe(channel) => {
                let mut channels = self.channels.lock().await;
                channels.insert(channel.id(), channel.clone());
                Handled
            }
            Event::Unsubscribe(channel) => {
                let mut channels = self.channels.lock().await;
                channels.remove(&channel.id());
                Handled
            }
            Event::MicMuted(muted) => {
                if let Some(tx) = self.mic_muted_tx.take() {
                    let _ = tx.send(*muted);
                }
                Handled
            }
            Event::SpeakerMuted(muted) => {
                if let Some(tx) = self.speaker_muted_tx.take() {
                    let _ = tx.send(*muted);
                }
                Handled
            }
            _ => Super,
        }
    }

    #[state(superstate = "common")]
    async fn running_active(event: &Event) -> Response<State> {
        match event {
            Event::Stop => Transition(State::inactive()),
            Event::Pause => Transition(State::running_paused()),
            _ => Super,
        }
    }

    #[state(superstate = "common")]
    async fn running_paused(event: &Event) -> Response<State> {
        match event {
            Event::Resume => Transition(State::running_active()),
            _ => Super,
        }
    }

    #[state(entry_action = "enter_inactive", superstate = "common")]
    async fn inactive(&mut self, event: &Event) -> Response<State> {
        match event {
            Event::Start(id) => match self.setup_resources(id).await {
                Ok(_) => Transition(State::running_active()),
                Err(e) => {
                    // TODO: emit event
                    tracing::error!("error: {:?}", e);
                    Transition(State::inactive())
                }
            },
            _ => Super,
        }
    }

    #[action]
    async fn enter_inactive(&mut self) {
        self.teardown_resources().await;
    }

    fn on_transition(&mut self, source: &State, target: &State) {
        #[cfg(debug_assertions)]
        println!("transitioned from `{:?}` to `{:?}`", source, target);
    }
}

impl serde::Serialize for State {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            State::Inactive {} => serializer.serialize_str("__LISTENER_TODO__inactive"),
            State::RunningActive {} => serializer.serialize_str("__LISTENER_TODO__running_active"),
            State::RunningPaused {} => serializer.serialize_str("__LISTENER_TODO__running_paused"),
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
