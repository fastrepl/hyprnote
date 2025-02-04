use futures_util::StreamExt;
use hypr_audio::AsyncSource;

pub struct SessionState {
    handle: Option<tokio::task::JoinHandle<()>>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub enum SessionStatus {
    Timeline(hypr_bridge::TimelineView),
    Stopped,
}

const SAMPLE_RATE: u32 = 16000;

impl SessionState {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self { handle: None })
    }

    pub async fn start(
        &mut self,
        bridge: hypr_bridge::Client,
        language: codes_iso_639::part_1::LanguageCode,
        app_dir: std::path::PathBuf,
        session_id: String,
        channel: tauri::ipc::Channel<SessionStatus>,
    ) -> Result<(), String> {
        let audio_stream = {
            let input = {
                #[cfg(all(debug_assertions, feature = "sim-english-1"))]
                {
                    hypr_audio::AudioInput::from_recording(hypr_data::english_1::AUDIO.to_vec())
                }

                #[cfg(all(debug_assertions, feature = "sim-korean-1"))]
                {
                    hypr_audio::AudioInput::from_recording(hypr_data::korean_1::AUDIO.to_vec())
                }

                #[cfg(not(any(
                    all(debug_assertions, feature = "sim-english-1"),
                    all(debug_assertions, feature = "sim-korean-1")
                )))]
                {
                    hypr_audio::AudioInput::new()
                }
            };

            input.stream()
        }
        .resample(SAMPLE_RATE);

        let (backup_tx, mut backup_rx) =
            tokio::sync::mpsc::channel::<f32>((SAMPLE_RATE as usize) * 2);
        let (network_tx, network_rx) =
            tokio::sync::mpsc::channel::<f32>((SAMPLE_RATE as usize) * 2);

        tokio::spawn({
            let mut audio_stream = audio_stream;
            async move {
                while let Some(chunk) = audio_stream.next().await {
                    if let Err(e) = backup_tx.send(chunk).await {
                        tracing::error!("Error sending chunk to backup: {:?}", e);
                    }
                    if let Err(e) = network_tx.send(chunk).await {
                        tracing::error!("Error sending chunk to network: {:?}", e);
                    }
                }
            }
        });

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

            while let Some(sample) = backup_rx.recv().await {
                if let Err(e) = wav.write_sample(sample) {
                    eprintln!("Error writing sample to wav: {:?}", e);
                }
            }
        });

        let listen_client = bridge.listen().language(language).build();
        let stream = hypr_audio::ReceiverStreamSource::new(network_rx, SAMPLE_RATE);

        let listen_stream = match listen_client.from_audio(stream).await {
            Ok(stream) => stream,
            Err(e) => {
                return Err(e.to_string());
            }
        };

        let mut timeline = hypr_bridge::Timeline::default();

        let handle = tokio::spawn(async move {
            futures_util::pin_mut!(listen_stream);

            while let Some(result) = listen_stream.next().await {
                match result {
                    hypr_bridge::ListenOutputChunk::Transcribe(chunk) => {
                        timeline.add_transcription(chunk);
                    }
                    hypr_bridge::ListenOutputChunk::Diarize(chunk) => {
                        timeline.add_diarization(chunk);
                    }
                }

                let view = timeline.view();
                let out = SessionStatus::Timeline(view);
                channel.send(out).unwrap();
            }

            let out = SessionStatus::Stopped;
            channel.send(out).unwrap();
        });

        self.handle = Some(handle);

        Ok(())
    }
    pub async fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
        }
    }
}
