use futures_util::StreamExt;

pub struct SessionState {
    bridge: hypr_bridge::Client,
    handle: Option<tauri::async_runtime::JoinHandle<()>>,
}

impl SessionState {
    pub fn new(bridge: hypr_bridge::Client) -> anyhow::Result<Self> {
        Ok(Self {
            bridge,
            handle: None,
        })
    }

    pub async fn start(
        &mut self,
        channel: tauri::ipc::Channel<hypr_bridge::TranscribeOutputChunk>,
    ) {
        let mic = hypr_audio::MicInput::default();
        let audio_stream = mic.stream().unwrap();

        let transcript_stream = self.bridge.transcribe(audio_stream).await.unwrap();

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
    }

    pub async fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
        }
    }
}
