use owhisper_interface::stream::StreamResponse;

#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionEvent {
        #[serde(rename = "inactive")]
        Inactive { session_id: String },
        #[serde(rename = "running_active")]
        RunningActive { session_id: String },
        #[serde(rename = "finalizing")]
        Finalizing { session_id: String },
        #[serde(rename = "audioAmplitude")]
        AudioAmplitude {
            session_id: String,
            mic: u16,
            speaker: u16,
        },
        #[serde(rename = "micMuted")]
        MicMuted { session_id: String, value: bool },
        #[serde(rename = "streamResponse")]
        StreamResponse {
            session_id: String,
            response: Box<StreamResponse>,
        },
        #[serde(rename = "initializingAudio")]
        InitializingAudio { session_id: String },
        #[serde(rename = "audioReady")]
        AudioReady { session_id: String },
        #[serde(rename = "connecting")]
        Connecting { session_id: String },
        #[serde(rename = "connected")]
        Connected { session_id: String },
        #[serde(rename = "connectionError")]
        ConnectionError {
            session_id: String,
            error: String,
            retry_count: u32,
        },
        ExitRequested
    }
}
