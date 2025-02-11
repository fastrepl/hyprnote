use futures_util::StreamExt;
use tokio::sync::mpsc;

use hypr_audio::AsyncSource;

pub struct SessionState {
    mic_stream_handle: Option<tokio::task::JoinHandle<()>>,
    speaker_stream_handle: Option<tokio::task::JoinHandle<()>>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub enum SessionStatus {
    Timeline(hypr_bridge::TimelineView),
    Stopped,
}

const SAMPLE_RATE: u32 = 16000;

impl SessionState {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            mic_stream_handle: None,
            speaker_stream_handle: None,
        })
    }

    pub async fn start(
        &mut self,
        bridge: hypr_bridge::Client,
        language: codes_iso_639::part_1::LanguageCode,
        app_dir: std::path::PathBuf,
        session_id: String,
        channel: tauri::ipc::Channel<SessionStatus>,
    ) -> Result<(), String> {
        let mic_sample_stream = hypr_audio::AudioInput::from_mic().stream();
        let mic_sample_rate = mic_sample_stream.sample_rate();

        let speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();

        let mut mic_stream = mic_sample_stream.resample(SAMPLE_RATE).chunks(1024);

        let mut speaker_stream = speaker_sample_stream
            .resample_from_to(mic_sample_rate, SAMPLE_RATE)
            .chunks(1024);

        let (mic_tx, mut mic_rx) = mpsc::channel::<Vec<f32>>((SAMPLE_RATE as usize) * 60 * 10);
        let (speaker_tx, mut speaker_rx) =
            mpsc::channel::<Vec<f32>>((SAMPLE_RATE as usize) * 60 * 10);

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
                let mixed: Vec<f32> = mic_chunk
                    .into_iter()
                    .zip(speaker_chunk.into_iter())
                    .map(|(a, b)| (a + b).clamp(-1.0, 1.0))
                    .collect();

                for &sample in &mixed {
                    wav.write_sample(sample).unwrap();
                }
            }

            wav.finalize().unwrap();
        });

        Ok(())
    }

    pub async fn stop(&mut self) {
        if let Some(handle) = self.mic_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }
        if let Some(handle) = self.speaker_stream_handle.take() {
            handle.abort();
            let _ = handle.await;
        }
    }
}

pub mod commands {
    use anyhow::Result;
    use tauri::{ipc::Channel, Manager, State};

    use crate::{
        audio::AppSounds,
        session::{SessionState, SessionStatus},
    };

    #[tauri::command]
    #[specta::specta]
    pub async fn start_session<'a>(
        app: State<'_, crate::App>,
        session: State<'_, tokio::sync::Mutex<SessionState>>,
        on_event: Channel<SessionStatus>,
    ) -> Result<(), String> {
        let app_dir = app.handle.path().app_data_dir().unwrap();

        let user_id = &app.user_id;
        let config = app
            .db
            .get_config(user_id)
            .await
            .map_err(|e| e.to_string())?;

        let language = match config {
            Some(hypr_db::user::Config { general, .. }) => general.speech_language,
            _ => codes_iso_639::part_1::LanguageCode::En,
        };

        let ret = {
            let mut s = session.lock().await;

            s.start(
                app.bridge.clone(),
                language,
                app_dir,
                "123".to_string(),
                on_event,
            )
            .await
        };

        AppSounds::StartRecording.play();
        ret
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
        AppSounds::StopRecording.play();
        Ok(())
    }
}
