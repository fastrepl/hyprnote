#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            PartialEq,
            Debug,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        #[schemars(deny_unknown_fields)]
        $item
    };
}

common_derives! {
    #[derive(Default)]
    pub struct Word {
        pub text: String,
        pub speaker: Option<SpeakerIdentity>,
        pub confidence: Option<f32>,
        pub start_ms: Option<u64>,
        pub end_ms: Option<u64>,
    }
}

common_derives! {
    #[serde(tag = "type", content = "value")]
    pub enum SpeakerIdentity {
        #[serde(rename = "unassigned")]
        Unassigned { index: u8 },
        #[serde(rename = "assigned")]
        Assigned { id: String, label: String },
    }
}

common_derives! {
    #[derive(Default)]
    pub struct ListenOutputChunk {
        pub meta: Option<serde_json::Value>,
        pub words: Vec<Word>,
    }
}

common_derives! {
    #[serde(tag = "type", content = "value")]
    pub enum ListenInputChunk {
        #[serde(rename = "audio")]
        Audio {
            #[serde(serialize_with = "serde_bytes::serialize")]
            data: Vec<u8>,
        },
        #[serde(rename = "dual_audio")]
        DualAudio {
            #[serde(serialize_with = "serde_bytes::serialize")]
            mic: Vec<u8>,
            #[serde(serialize_with = "serde_bytes::serialize")]
            speaker: Vec<u8>,
        },
        #[serde(rename = "end")]
        End,
    }
}

common_derives! {
    #[derive(strum::AsRefStr)]
    pub enum AudioMode {
        #[serde(rename = "single")]
        #[strum(serialize = "single")]
        Single,
        #[serde(rename = "dual")]
        #[strum(serialize = "dual")]
        Dual,
    }
}

impl Default for AudioMode {
    fn default() -> Self {
        AudioMode::Single
    }
}

common_derives! {
    #[derive(Default)]
    pub struct ListenParams {
        pub audio_mode: AudioMode,
        // https://docs.rs/axum-extra/0.10.1/axum_extra/extract/struct.Query.html#example-1
        #[serde(default)]
        pub languages: Vec<hypr_language::Language>,
        pub static_prompt: String,
        pub dynamic_prompt: String,
        pub redemption_time_ms: u64,
    }
}

#[deprecated]
#[derive(serde::Deserialize)]
pub struct ConversationChunk {
    pub start: chrono::DateTime<chrono::Utc>,
    pub end: chrono::DateTime<chrono::Utc>,
    pub transcripts: Vec<TranscriptChunk>,
    pub diarizations: Vec<DiarizationChunk>,
}

#[deprecated]
#[derive(serde::Deserialize)]
pub struct TranscriptChunk {
    pub start: u64,
    pub end: u64,
    pub text: String,
    pub confidence: Option<f32>,
}

#[deprecated]
#[derive(serde::Deserialize)]
pub struct DiarizationChunk {
    pub start: u64,
    pub end: u64,
    pub speaker: i32,
    pub confidence: Option<f32>,
}
