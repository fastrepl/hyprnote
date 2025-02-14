use tauri::{ipc::Channel, Manager, State};

use futures_util::StreamExt;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

use hypr_audio::AsyncSource;

pub struct SessionState {
    timeline: Option<Arc<Mutex<hypr_bridge::Timeline>>>,
    mic_stream_handle: Option<tokio::task::JoinHandle<()>>,
    speaker_stream_handle: Option<tokio::task::JoinHandle<()>>,
    listen_stream_handle: Option<tokio::task::JoinHandle<()>>,
    silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub enum SessionStatus {
    Stopped,
    Audio(u16, u16),
    TimelineView(hypr_bridge::TimelineView),
}

const SAMPLE_RATE: u32 = 16000;

impl SessionState {
    pub fn new() -> Result<Self, crate::Error> {
        Ok(Self {
            timeline: None,
            mic_stream_handle: None,
            speaker_stream_handle: None,
            listen_stream_handle: None,
            silence_stream_tx: None,
        })
    }

    pub async fn start(
        &mut self,
        bridge: hypr_bridge::Client,
        language: hypr_bridge::LanguageCode,
        app_dir: std::path::PathBuf,
        session_id: String,
        channel: tauri::ipc::Channel<SessionStatus>,
    ) -> Result<(), crate::Error> {
        let mic_sample_stream = {
            let mut input = hypr_audio::AudioInput::from_mic();
            // {
            //     #[cfg(all(debug_assertions, feature = "sim-english-1"))]
            //     {
            //         hypr_audio::AudioInput::from_recording(hypr_data::english_1::AUDIO.to_vec())
            //     }

            //     #[cfg(all(debug_assertions, feature = "sim-korean-1"))]
            //     {
            //         hypr_audio::AudioInput::from_recording(hypr_data::korean_1::AUDIO.to_vec())
            //     }

            //     #[cfg(not(any(
            //         all(debug_assertions, feature = "sim-english-1"),
            //         all(debug_assertions, feature = "sim-korean-1")
            //     )))]
            //     {
            //         hypr_audio::AudioInput::from_mic()
            //     }
            // };

            input.stream()
        };
        let speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();

        let mic_sample_rate = mic_sample_stream.sample_rate();
        let mut mic_stream = mic_sample_stream.resample(SAMPLE_RATE).chunks(1024);

        let mut speaker_stream = speaker_sample_stream
            .resample_from_to(mic_sample_rate, SAMPLE_RATE)
            .chunks(1024);

        let chunk_buffer_size: usize = 1024;
        let sample_buffer_size = (SAMPLE_RATE as usize) * 60 * 10;

        let (mic_tx, mut mic_rx) = mpsc::channel::<Vec<f32>>(chunk_buffer_size);
        let (speaker_tx, mut speaker_rx) = mpsc::channel::<Vec<f32>>(chunk_buffer_size);
        let (mixed_tx, mixed_rx) = mpsc::channel::<f32>(sample_buffer_size);

        self.silence_stream_tx = Some(hypr_audio::AudioOutput::silence());

        self.mic_stream_handle = Some(tokio::spawn({
            async move {
                while let Some(chunk) = mic_stream.next().await {
                    if let Err(e) = mic_tx.send(chunk).await {
                        tracing::error!("mic_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        }));

        self.speaker_stream_handle = Some(tokio::spawn({
            async move {
                while let Some(chunk) = speaker_stream.next().await {
                    if let Err(e) = speaker_tx.send(chunk).await {
                        tracing::error!("speaker_tx_send_error: {:?}", e);
                        break;
                    }
                }
            }
        }));

        let channel_for_amplitude = channel.clone();
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
                let mic_amplitude = get_amplitude(&mic_chunk);
                let speaker_amplitude = get_amplitude(&speaker_chunk);

                channel_for_amplitude
                    .send(SessionStatus::Audio(mic_amplitude, speaker_amplitude))
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

        let timeline = Arc::new(Mutex::new(hypr_bridge::Timeline::default()));
        self.timeline = Some(timeline.clone());

        let listen_client = bridge.listen().language(language).build();
        let audio_stream = hypr_audio::ReceiverStreamSource::new(mixed_rx, SAMPLE_RATE);
        let listen_stream = listen_client.from_audio(audio_stream).await.unwrap();

        self.listen_stream_handle = Some(tokio::spawn({
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

                    channel
                        .send(SessionStatus::TimelineView(
                            timeline.view(hypr_bridge::TimelineFilter::default()),
                        ))
                        .unwrap();
                }

                channel.send(SessionStatus::Stopped).unwrap();
            }
        }));

        Ok(())
    }

    pub async fn stop(&mut self) {
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
    }
}

fn get_amplitude(chunk: &[f32]) -> u16 {
    (chunk
        .iter()
        .map(|&x| x.abs())
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .unwrap_or(0.0)
        * 100.0) as u16
}

#[tauri::command]
#[specta::specta]
pub async fn start_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session: State<'_, tokio::sync::Mutex<SessionState>>,
    on_event: Channel<SessionStatus>,
) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().unwrap();

    let bridge = hypr_bridge::Client::builder()
        .api_base("http://localhost:1234".to_string())
        .api_key("123".to_string())
        .build()
        .unwrap();

    let language = hypr_bridge::LanguageCode::En;

    let ret = {
        let mut s = session.lock().await;

        s.start(bridge, language, app_dir, "123".to_string(), on_event)
            .await
    };

    // AppSounds::StartRecording.play();
    ret.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session(
    session: State<'_, tokio::sync::Mutex<SessionState>>,
) -> Result<(), String> {
    {
        let mut s = session.lock().await;
        s.stop().await;
    }
    // AppSounds::StopRecording.play();
    Ok(())
}
