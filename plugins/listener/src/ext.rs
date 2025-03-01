use std::future::Future;
use std::sync::Arc;

use futures_util::StreamExt;
use hypr_audio::AsyncSource;
use tauri::ipc::Channel;
use tokio::sync::{mpsc, Mutex};

use crate::{SessionEvent, SessionEventTimelineView, TimelineFilter, TimelineView};

const SAMPLE_RATE: u32 = 16000;

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn request_microphone_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn request_system_audio_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn open_microphone_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_system_audio_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn subscribe(&self, channel: Channel<SessionEvent>) -> impl Future<Output = ()>;
    fn unsubscribe(&self, channel: Channel<SessionEvent>) -> impl Future<Output = ()>;
    fn broadcast(&self, event: SessionEvent) -> impl Future<Output = Result<(), crate::Error>>;
    fn get_timeline(&self, filter: TimelineFilter) -> impl Future<Output = TimelineView>;
    fn start_session(&self) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_session(&self) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn request_microphone_access(&self) -> Result<bool, crate::Error> {
        let mut mic_sample_stream = hypr_audio::AudioInput::from_mic().stream();
        let sample = mic_sample_stream.next().await;
        Ok(sample.is_some())
    }

    #[tracing::instrument(skip_all)]
    async fn request_system_audio_access(&self) -> Result<bool, crate::Error> {
        let stop = hypr_audio::AudioOutput::silence();

        let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker(None).stream();
        let sample = speaker_sample_stream.next().await;

        let _ = stop.send(());
        Ok(sample.is_some())
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
    async fn subscribe(&self, channel: Channel<SessionEvent>) {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        let id = channel.id();
        s.channels.lock().await.insert(id, channel);
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
    async fn get_timeline(&self, filter: TimelineFilter) -> TimelineView {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        match s.timeline.as_ref() {
            None => TimelineView::default(),
            Some(timeline) => {
                let timeline_view = timeline.lock().await.view(filter);
                timeline_view
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self) -> Result<String, crate::Error> {
        let state = self.state::<crate::SharedState>();

        {
            let s = state.lock().await;
            if s.timeline.is_some() {
                return Err(crate::Error::SessionAlreadyStarted);
            }
        }

        let session_id = "123";
        let app_dir = self.path().app_data_dir().unwrap();

        let api_base = {
            let app = self.app_handle();
            use tauri_plugin_connector::ConnectorPluginExt;
            app.get_api_base(tauri_plugin_connector::ConnectionType::AutoSTT)
                .await
                .unwrap()
        };

        let listen_client = crate::client::ListenClient::builder()
            .api_base(api_base)
            .api_key("123".to_string())
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();

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
                while let Some(chunk) = mic_stream.next().await {
                    if let Err(e) = mic_tx.send(chunk).await {
                        tracing::error!("mic_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        });

        let speaker_stream_handle = tokio::spawn({
            async move {
                while let Some(chunk) = speaker_stream.next().await {
                    if let Err(e) = speaker_tx.send(chunk).await {
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

            let mut wav = hound::WavWriter::create(
                path,
                hound::WavSpec {
                    channels: 1,
                    sample_rate: SAMPLE_RATE,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                },
            )
            .unwrap();

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

        let timeline = Arc::new(Mutex::new(crate::Timeline::default()));
        let audio_stream = hypr_audio::ReceiverStreamSource::new(mixed_rx, SAMPLE_RATE);

        {
            let mut s = state.lock().await;
            s.timeline = Some(timeline.clone());
            s.silence_stream_tx = Some(silence_stream_tx);
            s.mic_stream_handle = Some(mic_stream_handle);
            s.speaker_stream_handle = Some(speaker_stream_handle);
        }

        let listen_stream = listen_client.from_audio(audio_stream).await.unwrap();

        let listen_stream_handle = tokio::spawn({
            let app = self.app_handle().clone();
            let timeline = timeline.clone();

            async move {
                futures_util::pin_mut!(listen_stream);

                while let Some(result) = listen_stream.next().await {
                    let mut timeline = timeline.lock().await;

                    match result {
                        crate::ListenOutputChunk::Transcribe(chunk) => {
                            timeline.add_transcription(chunk);
                        }
                        crate::ListenOutputChunk::Diarize(chunk) => {
                            timeline.add_diarization(chunk);
                        }
                    }

                    app.broadcast(SessionEvent::TimelineView(SessionEventTimelineView {
                        timeline: timeline.view(crate::TimelineFilter::default()),
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

        Ok(session_id.to_string())
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
