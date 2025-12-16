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
    pub enum BatchEvent {
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
        #[serde(rename = "batchCloudResponse")]
        BatchCloudResponse {
            session_id: String,
            provider_response: String,
        },
        #[serde(rename = "batchFailed")]
        BatchFailed { session_id: String, error: String },
    }
}
