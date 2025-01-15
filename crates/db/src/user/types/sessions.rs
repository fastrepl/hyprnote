use serde::{Deserialize, Serialize};
use time::{format_description::well_known::Rfc3339, serde::rfc3339, OffsetDateTime};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Session {
    pub id: String,
    #[serde(with = "rfc3339")]
    pub timestamp: OffsetDateTime,
    pub title: String,
    pub tags: Vec<String>,
    pub audio_local_path: Option<String>,
    pub audio_remote_path: Option<String>,
    pub raw_memo_html: String,
    pub enhanced_memo_html: Option<String>,
    pub transcript: Option<Transcript>,
}

impl Session {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            timestamp: OffsetDateTime::parse(row.get_str(1).expect("timestamp"), &Rfc3339).unwrap(),
            // calendar_event_id
            title: row.get(3).expect("title"),
            audio_local_path: row.get(4).expect("audio_local_path"),
            audio_remote_path: row.get(5).expect("audio_remote_path"),
            tags: serde_json::from_str(row.get_str(6).expect("tags")).unwrap(),
            raw_memo_html: row.get(7).expect("raw_memo_html"),
            enhanced_memo_html: row.get(8).expect("enhanced_memo_html"),
            transcript: serde_json::from_str(row.get_str(9).expect("transcript")).unwrap(),
        })
    }
}

impl Default for Session {
    fn default() -> Self {
        Session {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: OffsetDateTime::now_utc(),
            title: "".to_string(),
            tags: vec![],
            audio_local_path: None,
            audio_remote_path: None,
            raw_memo_html: "".to_string(),
            enhanced_memo_html: None,
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
