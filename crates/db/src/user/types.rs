use serde::{de::DeserializeOwned, Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};

pub use hypr_calendar::{Calendar, Event};

pub fn register_all(collection: &mut specta_util::TypeCollection) {
    collection.register::<Session>();
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Session {
    pub id: u16,
    #[serde(with = "timestamp")]
    pub timestamp: OffsetDateTime,
    pub title: String,
    pub tags: Vec<String>,
    pub audio_local_path: Option<String>,
    pub audio_remote_path: Option<String>,
    pub raw_memo: Option<serde_json::Value>,
    pub enhanced_memo: Option<serde_json::Value>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRow {
    pub id: u16,
    pub timestamp: u64,
    pub title: String,
    pub tags: Option<String>,
    pub audio_local_path: Option<String>,
    pub audio_remote_path: Option<String>,
    pub raw_memo: Option<String>,
    pub enhanced_memo: Option<String>,
    pub transcript: Option<String>,
}

impl From<SessionRow> for Session {
    fn from(row: SessionRow) -> Self {
        Session {
            id: row.id,
            timestamp: OffsetDateTime::from_unix_timestamp(row.timestamp as i64).unwrap(),
            title: row.title,
            audio_local_path: row.audio_local_path,
            audio_remote_path: row.audio_remote_path,
            tags: parse_json(&row.tags.unwrap_or("[]".to_string())),
            raw_memo: parse_json(&row.raw_memo.unwrap_or("null".to_string())),
            enhanced_memo: parse_json(&row.enhanced_memo.unwrap_or("null".to_string())),
            transcript: parse_json(&row.transcript.unwrap_or("null".to_string())),
        }
    }
}

impl From<Session> for SessionRow {
    fn from(session: Session) -> Self {
        SessionRow {
            id: session.id,
            timestamp: session.timestamp.unix_timestamp() as u64,
            title: session.title,
            audio_local_path: session.audio_local_path,
            audio_remote_path: session.audio_remote_path,
            tags: serde_json::to_string(&session.tags).ok(),
            raw_memo: serde_json::to_string(&session.raw_memo).ok(),
            enhanced_memo: serde_json::to_string(&session.enhanced_memo).ok(),
            transcript: serde_json::to_string(&session.transcript).ok(),
        }
    }
}

fn parse_json<T: DeserializeOwned>(json: &str) -> T {
    serde_json::from_str(json).unwrap()
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Transcript {
    pub speakers: Vec<String>,
    pub blocks: Vec<TranscriptBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct TranscriptBlock {
    pub timestamp: String,
    pub text: String,
    pub speaker: String,
}
