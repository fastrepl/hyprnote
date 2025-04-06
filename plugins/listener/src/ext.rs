use std::future::Future;
use std::sync::Arc;

use futures_util::StreamExt;
use hypr_audio::AsyncSource;
use tauri::ipc::Channel;
use tokio::sync::{mpsc, Mutex};

#[cfg(target_os = "macos")]
use {
    objc2::{class, msg_send, runtime::Bool},
    objc2_foundation::NSString,
};

use crate::{SessionEvent, SessionEventStarted, SessionEventTimelineView};
use hypr_timeline::{Timeline, TimelineFilter};

const SAMPLE_RATE: u32 = 16000;

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn check_microphone_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn check_system_audio_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn request_microphone_access(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn request_system_audio_access(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_microphone_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_system_audio_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;

    fn subscribe(&self, c: Channel<SessionEvent>)
        -> impl Future<Output = Result<(), crate::Error>>;
    fn unsubscribe(&self, c: Channel<SessionEvent>) -> impl Future<Output = ()>;
    fn broadcast(&self, event: SessionEvent) -> impl Future<Output = Result<(), crate::Error>>;

    fn get_mic_muted(&self) -> impl Future<Output = bool>;
    fn get_speaker_muted(&self) -> impl Future<Output = bool>;
    fn set_mic_muted(&self, muted: bool) -> impl Future<Output = ()>;
    fn set_speaker_muted(&self, muted: bool) -> impl Future<Output = ()>;

    fn stop_session(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn start_session(
        &self,
        id: impl Into<String>,
    ) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn check_microphone_access(&self) -> Result<bool, crate::Error> {
        #[cfg(target_os = "macos")]
        // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L157
        {
            unsafe {
                let av_media_type = NSString::from_str("soun");
                let status: i32 = msg_send![
                    class!(AVCaptureDevice),
                    authorizationStatusForMediaType: &*av_media_type
                ];

                Ok(status == 3)
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let mut mic_sample_stream = hypr_audio::AudioInput::from_mic().stream();
            let sample = mic_sample_stream.next().await;
            Ok(sample.is_some())
        }
    }

    #[tracing::instrument(skip_all)]
    async fn check_system_audio_access(&self) -> Result<bool, crate::Error> {
        Ok(true)
    }

    #[tracing::instrument(skip_all)]
    async fn request_microphone_access(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L184
        {
            unsafe {
                let av_media_type = NSString::from_str("soun");
                type CompletionBlock = Option<extern "C" fn(Bool)>;
                let completion_block: CompletionBlock = None;
                let _: () = msg_send![
                    class!(AVCaptureDevice),
                    requestAccessForMediaType: &*av_media_type,
                    completionHandler: completion_block
                ];
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let mut mic_sample_stream = hypr_audio::AudioInput::from_mic().stream();
            mic_sample_stream.next().await;
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn request_system_audio_access(&self) -> Result<(), crate::Error> {
        let stop = hypr_audio::AudioOutput::silence();

        let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker(None).stream();
        speaker_sample_stream.next().await;

        let _ = stop.send(());
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn open_microphone_access_settings(&self) -> Result<(), crate::Error> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
            .spawn()?
            .wait()?;
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn open_system_audio_access_settings(&self) -> Result<(), crate::Error> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture")
            .spawn()?
            .wait()?;
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn subscribe(&self, channel: Channel<SessionEvent>) -> Result<(), crate::Error> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        match s.listen_stream_handle {
            None => Err(crate::Error::SessionNotStarted),
            Some(_) => {
                let id = channel.id();
                s.channels.lock().await.insert(id, channel);
                Ok(())
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn unsubscribe(&self, channel: Channel<SessionEvent>) {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        let id = channel.id();
        s.channels.lock().await.remove(&id);
    }

    #[tracing::instrument(skip_all)]
    async fn broadcast(&self, event: SessionEvent) -> Result<(), crate::Error> {
        let state = self.state::<crate::SharedState>();
        let channels = {
            let s = state.lock().await;
            s.channels.clone()
        };
        let channels = channels.lock().await;

        for (_id, channel) in channels.iter() {
            let _ = channel.send(event.clone());
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_mic_muted(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.mic_muted.unwrap_or(false)
    }

    #[tracing::instrument(skip_all)]
    async fn get_speaker_muted(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.speaker_muted.unwrap_or(false)
    }

    #[tracing::instrument(skip_all)]
    async fn set_mic_muted(&self, muted: bool) {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        if let Some(tx) = &s.mic_muted_tx {
            if tx.send(muted).is_ok() {
                s.mic_muted = Some(muted);
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_speaker_muted(&self, muted: bool) {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        if let Some(tx) = &s.speaker_muted_tx {
            if tx.send(muted).is_ok() {
                s.speaker_muted = Some(muted);
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, session_id: impl Into<String>) -> Result<(), crate::Error> {
        self.stop_session().await?;

        let app = self.app_handle();
        let state = self.state::<crate::SharedState>();

        let session_id = session_id.into();
        let mut session = {
            use tauri_plugin_db::DatabasePluginExt;
            app.db_get_session(&session_id)
                .await?
                .ok_or(crate::Error::NoneSession)?
        };

        {
            let mut s = state.lock().await;
            s.mic_muted = Some(false);
            s.speaker_muted = Some(false);

            if s.timeline.is_some() {
                return Err(crate::Error::SessionAlreadyStarted);
            }
        }

        let (mic_muted_tx, mic_muted_rx) = tokio::sync::watch::channel(false);
        let (speaker_muted_tx, speaker_muted_rx) = tokio::sync::watch::channel(false);

        {
            let mut s = state.lock().await;
            s.mic_muted_tx = Some(mic_muted_tx);
            s.speaker_muted_tx = Some(speaker_muted_tx);
            s.mic_muted = Some(false);
            s.speaker_muted = Some(false);
        }

        let app_dir = self.path().app_data_dir().unwrap();

        let listen_client = setup_listen_client(app).await?;

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

        let silence_stream_tx = hypr_audio::AudioOutput::silence();

        let mic_stream_handle = tokio::spawn({
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
        });

        let speaker_stream_handle = tokio::spawn({
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
        });

        let app = self.app_handle().clone();

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
            app.broadcast(start_event).await.unwrap();

            while let (Some(mic_chunk), Some(speaker_chunk)) =
                (mic_rx.recv().await, speaker_rx.recv().await)
            {
                let event = crate::SessionEventAudioAmplitude::from((&mic_chunk, &speaker_chunk));

                app.broadcast(SessionEvent::AudioAmplitude(event))
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

        {
            let mut s = state.lock().await;
            s.timeline = Some(timeline.clone());
            s.silence_stream_tx = Some(silence_stream_tx);
            s.mic_stream_handle = Some(mic_stream_handle);
            s.speaker_stream_handle = Some(speaker_stream_handle);
        }

        let listen_stream = match listen_client.from_audio(audio_stream).await {
            Ok(stream) => stream,
            Err(e) => {
                tracing::error!(e = ?e, "listen_stream");
                let _ = self.stop_session().await;
                return Err(crate::Error::ListenClientError(e));
            }
        };

        let listen_stream_handle = tokio::spawn({
            let app = self.app_handle().clone();
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

                    app.broadcast(SessionEvent::TimelineView(SessionEventTimelineView {
                        timeline: timeline.view(TimelineFilter::default()),
                    }))
                    .await
                    .unwrap();
                }

                app.broadcast(SessionEvent::Stopped).await.unwrap();
            }
        });

        {
            let mut s = state.lock().await;
            s.listen_stream_handle = Some(listen_stream_handle);
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) -> Result<(), crate::Error> {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        s.timeline = None;

        if let Some(handle) = s.mic_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }
        if let Some(handle) = s.speaker_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }
        if let Some(tx) = s.silence_stream_tx.take() {
            let _ = tx.send(());
        }
        if let Some(handle) = s.listen_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }

        s.channels.lock().await.clear();

        Ok(())
    }
}

async fn setup_listen_client<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
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
        .language(codes_iso_639::part_1::LanguageCode::En)
        .build())
}

async fn update_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session: &mut hypr_db_user::Session,
    transcript: hypr_listener_interface::TranscriptChunk,
) -> Result<(), crate::Error> {
    use tauri_plugin_db::DatabasePluginExt;

    session.conversations.push(hypr_db_user::ConversationChunk {
        transcripts: vec![transcript],
        diarizations: vec![],
        start: chrono::Utc::now(),
        end: chrono::Utc::now(),
    });

    app.db_upsert_session(session.clone()).await.unwrap();
    Ok(())
}
