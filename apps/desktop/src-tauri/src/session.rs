use futures_util::StreamExt;
use kalosm_sound::AsyncSource;
use std::sync::mpsc;

pub struct SessionState {
    bridge: hypr_bridge::Client,
    audio_tx: Option<mpsc::Sender<Vec<u8>>>,
    transcript_rx: Option<mpsc::Receiver<String>>,
}

impl SessionState {
    pub fn new(bridge: hypr_bridge::Client) -> anyhow::Result<Self> {
        let mic = hypr_audio::MicInput::default();
        let _mic_stream = mic.stream().unwrap();

        Ok(Self {
            bridge,
            audio_tx: None,
            transcript_rx: None,
        })
    }

    pub async fn start(
        &mut self,
        channel: tauri::ipc::Channel<hypr_bridge::TranscribeOutputChunk>,
    ) {
        let mic = hypr_audio::MicInput::default();
        let audio_stream = mic.stream().unwrap();

        let transcript_stream = self.bridge.transcribe(audio_stream).await.unwrap();

        tauri::async_runtime::spawn(async move {
            futures_util::pin_mut!(transcript_stream);

            while let Some(transcript) = transcript_stream.next().await {
                if channel.send(transcript).is_err() {
                    break;
                }
            }
        });
    }
}
