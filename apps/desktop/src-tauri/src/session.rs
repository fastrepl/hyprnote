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

    pub async fn start(&mut self, channel: tauri::ipc::Channel) {
        let mic = hypr_audio::MicInput::default();
        let audio_stream = mic.stream().unwrap();

        let transcript_stream = self.bridge.transcribe(audio_stream).await.unwrap();
    }
}
