use futures_util::StreamExt;
use hypr_audio::AsyncSource;

pub struct SessionState {
    handle: Option<tauri::async_runtime::JoinHandle<()>>,
}

impl SessionState {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self { handle: None })
    }

    pub async fn start(
        &mut self,
        bridge: hypr_bridge::Client,
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
                    hypr_audio::MicInput::default()
                }
            };

            input.stream()
        }
        .resample(16000);

        let listen_client = bridge
            .listen()
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();

        let listen_stream = listen_client.from_audio(audio_stream).await.unwrap();

        let handle: tauri::async_runtime::JoinHandle<()> =
            tauri::async_runtime::spawn(async move {
                futures_util::pin_mut!(listen_stream);

                while let Some(result) = listen_stream.next().await {
                    println!("result: {:?}", result);
                }
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
