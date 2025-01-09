use std::sync::mpsc;

pub struct SessionState {
    stream: hypr_audio::MicStream,
    bridge: hypr_bridge::Client,
    audio_tx: Option<mpsc::Sender<Vec<u8>>>,
    transcript_rx: Option<mpsc::Receiver<String>>,
}

impl SessionState {
    pub fn new(bridge: hypr_bridge::Client) -> anyhow::Result<Self> {
        let mic = hypr_audio::MicInput::default();
        let stream = mic.stream().unwrap();

        Ok(Self {
            stream,
            bridge,
            audio_tx: None,
            transcript_rx: None,
        })
    }

    pub async fn start(&mut self, channel: tauri::ipc::Channel) {
        let (audio_tx, transcript_rx) = self.bridge.transcribe().await.unwrap();

        // tokio::spawn(async move {
        //     while let Some(audio_chunk) = audio_stream.next().await {
        //         if self.audio_tx.send(audio_chunk).await.is_err() {
        //             break;
        //         }
        //     }
        // });
    }
}
