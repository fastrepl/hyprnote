use futures_util::StreamExt;
use hypr_audio::AsyncSource;
use hypr_audio::Sample;

pub struct SessionState {
    handle: Option<tauri::async_runtime::JoinHandle<()>>,
    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
}

impl SessionState {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            handle: None,
            shutdown: None,
        })
    }

    pub async fn start(
        &mut self,
        app_dir: std::path::PathBuf,
        session_id: String,
        _channel: tauri::ipc::Channel<Vec<f32>>,
    ) -> anyhow::Result<()> {
        let mic_stream = {
            let source = hypr_audio::MicInput::default();
            source.stream()
        }
        .resample(16000)
        .chunks(1024);

        let speaker_stream = {
            let source = hypr_audio::SpeakerInput::new().unwrap();
            source.stream().unwrap()
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

        // let transcribe_client = hypr_bridge::Client::builder()
        //     .api_base("http://localhost:8000")
        //     .api_key("TODO")
        //     .build()
        //     .unwrap()
        //     .transcribe()
        //     .language(codes_iso_639::part_1::LanguageCode::En)
        //     .build();

        let path = app_dir.join(format!("{}.wav", session_id));
        // let (_tx, rx) = tokio::sync::mpsc::channel(32);

        // let _transcribe_handle = {
        //     tokio::spawn(async move {
        //         let input_stream = hypr_audio::ReceiverStreamSource::new(rx, 16000);
        //         let transcript_stream = transcribe_client.from_audio(input_stream).await.unwrap();
        //         futures_util::pin_mut!(transcript_stream);

        //         while let Some(transcript) = transcript_stream.next().await {
        //             println!("Transcript: {:?}", transcript);
        //         }
        //     })
        // };

        let handle: tauri::async_runtime::JoinHandle<()> =
            tauri::async_runtime::spawn(async move {
                let mut writer = hound::WavWriter::create(&path, spec).unwrap();

                let mut combined_stream = mic_stream.zip(speaker_stream);

                // TODO: we're not receiving any mic stream after removing kalosm.
                tokio::select! {
                    _ = shutdown_rx => {}
                    _ = async {
                        while let Some((mic_chunk, speaker_chunk)) = combined_stream.next().await {
                            let mixed = hypr_audio::mix(&mic_chunk, &speaker_chunk);

                            for sample in mixed {
                                writer.write_sample(sample.to_sample::<i16>()).unwrap();
                            }
                        }
                        let _ = writer.finalize();
                    } => {},
                }
            });

        self.handle = Some(handle);
        Ok(())
    }

    pub async fn stop(&mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        if let Some(handle) = self.handle.take() {
            handle.abort();
        }

        // TODO:
        // upload... but we can not call stt direclty here.
        // need to call use bridge to upload chu

        self.handle = None;
        self.shutdown = None;
    }
}
