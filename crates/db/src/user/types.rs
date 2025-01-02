use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};

use crate::deserialize;
pub use hypr_calendar::{Calendar, Event};

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Session {
    pub id: u16,
    #[serde(with = "timestamp")]
    pub timestamp: OffsetDateTime,
    pub title: String,
    #[serde(deserialize_with = "deserialize::json_string")]
    pub tags: Vec<String>,
    pub audio_local_path: Option<String>,
    pub audio_remote_path: Option<String>,
    #[serde(deserialize_with = "deserialize::json_string")]
    pub raw_memo: Option<serde_json::Value>,
    #[serde(deserialize_with = "deserialize::json_string")]
    pub enhanced_memo: Option<serde_json::Value>,
    #[serde(deserialize_with = "deserialize::json_string")]
    pub transcript: Option<Transcript>,
}

impl Default for Session {
    fn default() -> Self {
        Session {
            id: 0,
            timestamp: OffsetDateTime::now_utc(),
            title: "".to_string(),
            tags: vec![],
            audio_local_path: None,
            audio_remote_path: None,
            raw_memo: None,
            enhanced_memo: None,
            transcript: None,
        }
    }
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Transcript {
    pub speakers: Vec<String>,
    pub blocks: Vec<TranscriptBlock>,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct TranscriptBlock {
    pub timestamp: String,
    pub text: String,
    pub speaker: String,
}
