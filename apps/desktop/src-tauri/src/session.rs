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

    pub async fn start_mic(
        &mut self,
        channel: tauri::ipc::Channel<hypr_bridge::TranscribeOutputChunk>,
    ) {
        let stream = {
            let source = hypr_audio::MicInput::default();
            source.stream().unwrap()
        };

        let transcribe_client = self
            .bridge
            .transcribe()
            .language(codes_iso_639::part_1::LanguageCode::Ko)
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
    }

    pub async fn start_capture(
        &mut self,
        channel: tauri::ipc::Channel<hypr_bridge::TranscribeOutputChunk>,
    ) {
        let stream = {
            // input is not 'Send'.
            let source = hypr_audio::SpeakerInput::new().unwrap();
            source.stream().unwrap()
        };

        let transcribe_client = self
            .bridge
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
    }

    pub async fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
        }
    }
}
