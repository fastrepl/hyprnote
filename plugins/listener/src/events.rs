use owhisper_interface::stream::StreamResponse;

use crate::error::{CriticalError, DegradedError};

#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(
            serde::Serialize, serde::Deserialize, Clone, specta::Type, tauri_specta::Event,
        )]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionLifecycleEvent {
        #[serde(rename = "inactive")]
        Inactive {
            session_id: String,
            #[serde(default)]
            error: Option<CriticalError>,
        },
        #[serde(rename = "active")]
        Active {
            session_id: String,
            #[serde(default)]
            error: Option<DegradedError>,
        },
        #[serde(rename = "finalizing")]
        Finalizing { session_id: String },
    }
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionProgressEvent {
        #[serde(rename = "audio_initializing")]
        AudioInitializing { session_id: String },
        #[serde(rename = "audio_ready")]
        AudioReady {
            session_id: String,
            device: Option<String>,
        },
        #[serde(rename = "connecting")]
        Connecting { session_id: String },
        #[serde(rename = "connected")]
        Connected { session_id: String, adapter: String },
    }
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionDataEvent {
        #[serde(rename = "audio_amplitude")]
        AudioAmplitude {
            session_id: String,
            mic: u16,
            speaker: u16,
        },
        #[serde(rename = "mic_muted")]
        MicMuted { session_id: String, value: bool },
        #[serde(rename = "stream_response")]
        StreamResponse {
            session_id: String,
            response: Box<StreamResponse>,
        },
    }
}
