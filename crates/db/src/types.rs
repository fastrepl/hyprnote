use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
    collection.register::<Transcript>();
    collection.register::<TranscriptBlock>();
}

#[allow(dead_code)]
#[derive(Debug, Type, FromRow)]
pub struct Session {
    pub id: Uuid,
    pub start: OffsetDateTime,
    pub end: Option<OffsetDateTime>,
    pub tags: Vec<String>,
    pub raw_memo: String,
    pub processed_memo: String,
    pub raw_transcript: String,
    #[sqlx(json)]
    pub processed_transcript: Option<Transcript>,
}

#[allow(dead_code)]
#[derive(Debug, Type, Serialize, Deserialize)]
pub struct TranscriptBlock {
    pub timestamp: OffsetDateTime,
    pub text: String,
    pub speaker: String,
}

#[allow(dead_code)]
#[derive(Debug, Type, Serialize, Deserialize)]
pub struct Transcript {
    pub speakers: Vec<String>,
    pub blocks: Vec<TranscriptBlock>,
}
