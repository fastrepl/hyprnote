use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
    collection.register::<Transcript>();
    collection.register::<TranscriptBlock>();
}

// All public struct must derive 'Debug, Serialize, Deserialize, specta::Type'.

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, specta::Type, sqlx::FromRow)]
pub struct Session {
    pub id: Uuid,
    pub start: OffsetDateTime,
    pub end: Option<OffsetDateTime>,
    pub recording_path: Option<String>,
    #[sqlx(json)]
    pub tags: Vec<String>,
    pub raw_memo: String,
    pub processed_memo: String,
    pub raw_transcript: String,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4(),
            start: OffsetDateTime::now_utc(),
            end: None,
            recording_path: None,
            tags: Vec::new(),
            raw_memo: String::new(),
            processed_memo: String::new(),
            raw_transcript: String::new(),
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct TranscriptBlock {
    pub timestamp: OffsetDateTime,
    pub text: String,
    pub speaker: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Transcript {
    pub speakers: Vec<String>,
    pub blocks: Vec<TranscriptBlock>,
}
