use std::future::Future;
use std::sync::Arc;

use futures_util::StreamExt;
use hypr_audio::AsyncSource;
use tokio::sync::{mpsc, Mutex};

use crate::SessionEvent;

const SAMPLE_RATE: u32 = 16000;

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn subscribe(
        &self,
        channel: tauri::ipc::Channel<SessionEvent>,
    ) -> impl Future<Output = Result<(), String>>;
    fn get_timeline(&self) -> impl Future<Output = Result<hypr_bridge::TimelineView, String>>;
    fn start_session(&self) -> impl Future<Output = Result<String, String>>;
    fn stop_session(&self) -> impl Future<Output = Result<(), String>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn subscribe(&self, channel: tauri::ipc::Channel<SessionEvent>) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        s.channels.lock().await.push(channel);
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_timeline(&self) -> Result<hypr_bridge::TimelineView, String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        let timeline_view = s
            .timeline
            .as_ref()
            .unwrap()
            .lock()
            .await
            .view(hypr_bridge::TimelineFilter::default());

        Ok(timeline_view)
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self) -> Result<String, String> {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        let session_id = "123";
        let app_dir = self.path().app_data_dir().unwrap();

        if s.timeline.is_some() {
            return Err("Session already started".to_string());
        }

        let bridge = hypr_bridge::Client::builder()
            .api_base("http://localhost:1234".to_string())
            .api_key("123".to_string())
            .build()
            .unwrap();

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

        s.silence_stream_tx = Some(hypr_audio::AudioOutput::silence());

        s.mic_stream_handle = Some(tokio::spawn({
            async move {
                while let Some(chunk) = mic_stream.next().await {
                    if let Err(e) = mic_tx.send(chunk).await {
                        tracing::error!("mic_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        }));

        s.speaker_stream_handle = Some(tokio::spawn({
            async move {
                while let Some(chunk) = speaker_stream.next().await {
                    if let Err(e) = speaker_tx.send(chunk).await {
                        tracing::error!("speaker_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        }));

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
                let _ = crate::SessionEventAudioAmplitude::from((&mic_chunk, &speaker_chunk));

                // channel_for_amplitude
                //     .send(SessionEvent::Audio(mic_amplitude, speaker_amplitude))
                //     .unwrap();

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

        let timeline = Arc::new(Mutex::new(hypr_bridge::Timeline::default()));
        s.timeline = Some(timeline.clone());

        // TODO
        let language = hypr_bridge::LanguageCode::En;

        let listen_client = bridge.listen().language(language).build();
        let audio_stream = hypr_audio::ReceiverStreamSource::new(mixed_rx, SAMPLE_RATE);
        let listen_stream = listen_client.from_audio(audio_stream).await.unwrap();

        s.listen_stream_handle = Some(tokio::spawn({
            let timeline = timeline.clone();

            async move {
                futures_util::pin_mut!(listen_stream);

                while let Some(result) = listen_stream.next().await {
                    let mut timeline = timeline.lock().await;

                    match result {
                        hypr_bridge::ListenOutputChunk::Transcribe(chunk) => {
                            timeline.add_transcription(chunk);
                        }
                        hypr_bridge::ListenOutputChunk::Diarize(chunk) => {
                            timeline.add_diarization(chunk);
                        }
                    }

                    // channel
                    //     .send(SessionEvent::TimelineView(
                    //         timeline.view(hypr_bridge::TimelineFilter::default()),
                    //     ))
                    //     .unwrap();
                }

                // channel.send(SessionEvent::Stopped).unwrap();
            }
        }));

        Ok(session_id.to_string())
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        if let Some(tx) = s.silence_stream_tx.take() {
            let _ = tx.send(());
        }
        if let Some(handle) = s.mic_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }
        if let Some(handle) = s.speaker_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }
        if let Some(handle) = s.listen_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }

        s.channels.lock().await.clear();

        Ok(())
    }
}
