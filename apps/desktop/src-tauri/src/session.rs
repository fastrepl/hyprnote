use futures_util::StreamExt;

// client will aware of this session
// but only need to know the status / stop,start it.
// no need to receive data, so no channel.
// BUT, since we do chunk/processing, than we might want to be aware of that though.
// so session will combine two audio stream, store to file, periodic upload etc.

// Also, we should be able to send Error through Channel

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

    // as we are accumulating audio, we should be able to have 3
    // 1. local file (chunk or whole)
    // 2. Diarazation result for that chunk
    // 3. Transcript result for that chunk
    // 4. (optional) VAD result for each channel, for that chunk.

    pub async fn start(
        &mut self,
        channel: tauri::ipc::Channel<hypr_bridge::TranscribeOutputChunk>,
    ) {
        let stream = {
            let source = hypr_audio::MicInput::default();
            source.stream().unwrap()
        };

        // let stream = {
        //     // input is not 'Send'.
        //     let source = hypr_audio::SpeakerInput::new().unwrap();
        //     source.stream().unwrap()
        // };

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

    pub async fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
        }
    }
}
