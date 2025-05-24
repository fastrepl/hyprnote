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
    pub struct ListenOutputChunk {
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
        #[serde(rename = "end")]
        End,
    }
}

impl Default for ListenInputChunk {
    fn default() -> Self {
        ListenInputChunk::End
    }
}

common_derives! {
    #[derive(Default)]
    pub struct ListenParams {
        #[specta(type = String)]
        #[schemars(with = "String")]
        #[serde(serialize_with = "serialize_language", deserialize_with = "deserialize_language")]
        pub language: hypr_language::Language,
        pub static_prompt: String,
        pub dynamic_prompt: String,
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

use serde::Deserialize;
use std::str::FromStr;

fn serialize_language<S: serde::Serializer>(
    lang: &hypr_language::Language,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    let code = lang.iso639().code();
    serializer.serialize_str(code)
}

fn deserialize_language<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<hypr_language::Language, D::Error> {
    let str = String::deserialize(deserializer)?;
    let iso639 = hypr_language::ISO639::from_str(&str).map_err(serde::de::Error::custom)?;
    Ok(iso639.into())
}
