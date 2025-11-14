use owhisper_interface::batch::Response as BatchResponse;
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
            response: StreamResponse,
        },
        #[serde(rename = "batchStarted")]
        BatchStarted { session_id: String },
        #[serde(rename = "batchResponse")]
        BatchResponse {
            session_id: String,
            response: BatchResponse,
        },
        #[serde(rename = "batchProgress")]
        BatchResponseStreamed {
            session_id: String,
            response: StreamResponse,
            percentage: f64,
        },
        #[serde(rename = "batchFailed")]
        BatchFailed { session_id: String, error: String },
    }
}
