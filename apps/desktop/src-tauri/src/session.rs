use futures_util::StreamExt;

use hypr_audio::AsyncSource;
use hypr_audio::Sample;
use hypr_bridge::Timeline;

pub struct SessionState {
    audio_handle: Option<tauri::async_runtime::JoinHandle<()>>,
    transcript_handle: Option<tauri::async_runtime::JoinHandle<()>>,
    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
    timeline: Timeline,
}

impl SessionState {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            audio_handle: None,
            transcript_handle: None,
            shutdown: None,
            timeline: Timeline::default(),
        })
    }

    pub async fn start(
        &mut self,
        app_dir: std::path::PathBuf,
        session_id: String,
        channel: tauri::ipc::Channel<hypr_bridge::ListenOutputChunk>,
    ) -> anyhow::Result<()> {
        let mut audio_stream = {
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
                    hypr_audio::AudioInput::from_mic()
                }
            };

            input.stream()
        }
        .resample(16000)
        .chunks(1024);

        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();
        self.shutdown = Some(shutdown_tx);

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let path = app_dir.join(format!("{}.wav", session_id));

        let (ws_tx, ws_rx) = tokio::sync::mpsc::channel(32);

        let transcript_handle = tauri::async_runtime::spawn(async move {
            let ws_stream = hypr_audio::ReceiverStreamSource::new(ws_rx, 16000);
            let client = hypr_bridge::Client::builder()
                .api_base("http://localhost:1234")
                .api_key("your_api_key")
                .build()
                .unwrap()
                .transcribe()
                .language(codes_iso_639::part_1::LanguageCode::En)
                .build();

            let listen_stream = client.from_audio(ws_stream).await.unwrap();
            futures_util::pin_mut!(listen_stream);

            while let Some(listen_output) = listen_stream.next().await {
                channel.send(listen_output).unwrap();
            }
        });

        let audio_handle = tauri::async_runtime::spawn(async move {
            let mut writer = hound::WavWriter::create(&path, spec).unwrap();

            tokio::select! {
                _ = shutdown_rx => {}
                _ = async {
                    while let Some(audio_chunk) = audio_stream.next().await {
                        for sample in audio_chunk {
                            writer.write_sample(sample.to_sample::<i16>()).unwrap();

                            if let Err(e) = ws_tx.send(sample).await {
                                println!("Error sending sample: {e}");
                                break;
                            }
                        }
                    }
                    let _ = writer.finalize();
                    anyhow::Ok(())
                } => {},
            }
        });

        self.audio_handle = Some(audio_handle);
        self.transcript_handle = Some(transcript_handle);
        Ok(())
    }

    pub async fn stop(&mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        if let Some(handle) = self.audio_handle.take() {
            handle.abort();
        }

        if let Some(handle) = self.transcript_handle.take() {
            handle.abort();
        }

        self.audio_handle = None;
        self.transcript_handle = None;
        self.shutdown = None;
    }
}
