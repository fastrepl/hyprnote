mod stream;
pub use stream::*;

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

// TODO: this is legacy format, but it works, and we already stored them in user db
common_derives! {
    #[derive(Default)]
    pub struct Word2 {
        pub text: String,
        pub speaker: Option<SpeakerIdentity>,
        pub confidence: Option<f32>,
        pub start_ms: Option<u64>,
        pub end_ms: Option<u64>,
    }
}

impl From<Word> for Word2 {
    fn from(word: Word) -> Self {
        Word2 {
            text: word.punctuated_word.unwrap_or(word.word),
            speaker: word
                .speaker
                .map(|s| SpeakerIdentity::Unassigned { index: s as u8 }),
            confidence: Some(word.confidence as f32),
            start_ms: Some((word.start * 1000.0) as u64),
            end_ms: Some((word.end * 1000.0) as u64),
        }
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
        pub words: Vec<Word2>,
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
    pub enum MixedMessage<A, C> {
        Audio(A),
        Control(C),
    }
}

// https://github.com/deepgram/deepgram-rust-sdk/blob/d2f2723/src/listen/websocket.rs#L772-L778
common_derives! {
    #[serde(tag = "type")]
    pub enum ControlMessage {
        Finalize,
        KeepAlive,
        CloseStream,
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
    pub struct ListenParams {
        #[serde(default)]
        pub model: Option<String>,
        pub channels: u8,
        // https://docs.rs/axum-extra/0.10.1/axum_extra/extract/struct.Query.html#example-1
        #[serde(default)]
        pub languages: Vec<hypr_language::Language>,
        pub redemption_time_ms: Option<u64>,
    }
}

impl Default for ListenParams {
    fn default() -> Self {
        ListenParams {
            model: None,
            channels: 1,
            languages: vec![],
            redemption_time_ms: None,
        }
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
