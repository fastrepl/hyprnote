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
        let stream = {
            let input = hypr_audio::MicInput::default();
            input.stream()
        }
        .resample(16000);

        let transcribe_client = bridge
            .transcribe()
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();

        let transcript_stream = transcribe_client.from_audio(stream).await.unwrap();

        let handle: tauri::async_runtime::JoinHandle<()> =
            tauri::async_runtime::spawn(async move {
                futures_util::pin_mut!(transcript_stream);

                while let Some(transcript) = transcript_stream.next().await {
                    if channel.send(transcript).is_err() {
                        break;
                    }
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
