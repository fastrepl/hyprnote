use serde::{Deserialize, Serialize};
use time::{format_description::well_known::Rfc3339, serde::rfc3339, OffsetDateTime};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Session {
    pub id: String,
    #[serde(with = "rfc3339")]
    pub timestamp: OffsetDateTime,
    pub calendar_event_id: Option<String>,
    pub title: String,
    pub tags: Vec<String>,
    pub audio_local_path: Option<String>,
    pub audio_remote_path: Option<String>,
    pub raw_memo_html: String,
    pub enhanced_memo_html: Option<String>,
    pub transcript: Option<Transcript>,
    pub diarization: Vec<hypr_stt::SpeakerSegment>,
}

impl Session {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            timestamp: OffsetDateTime::parse(row.get_str(1).expect("timestamp"), &Rfc3339).unwrap(),
            calendar_event_id: row.get(2).expect("calendar_event_id"),
            title: row.get(3).expect("title"),
            audio_local_path: row.get(4).expect("audio_local_path"),
            audio_remote_path: row.get(5).expect("audio_remote_path"),
            tags: row
                .get_str(6)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            raw_memo_html: row.get(7).expect("raw_memo_html"),
            enhanced_memo_html: row.get(8).expect("enhanced_memo_html"),
            transcript: row
                .get_str(9)
                .map(|s| serde_json::from_str(s).unwrap())
                .ok(),
            diarization: row
                .get_str(10)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
        })
    }
}

impl Default for Session {
    fn default() -> Self {
        Session {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: OffsetDateTime::now_utc(),
            calendar_event_id: None,
            title: "".to_string(),
            tags: vec![],
            audio_local_path: None,
            audio_remote_path: None,
            raw_memo_html: "".to_string(),
            enhanced_memo_html: None,
            transcript: None,
            diarization: vec![],
        }
    }
}
#[derive(Debug, Default, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Transcript {
    pub blocks: Vec<TranscriptBlock>,
}

#[derive(Debug, Default, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct TranscriptBlock {
    pub start: i32,
    pub end: i32,
    pub text: String,
}

impl Transcript {
    #[cfg(debug_assertions)]
    pub fn builder() -> TranscriptBuilder {
        TranscriptBuilder::default()
    }
}

#[cfg(debug_assertions)]
#[derive(Debug, Default)]
pub struct TranscriptBuilder {
    pub timestamp: i32,
    pub blocks: Vec<TranscriptBlock>,
}

#[cfg(debug_assertions)]
impl TranscriptBuilder {
    pub fn text(mut self, text: impl Into<String>) -> Self {
        let text = text.into();
        let text_len = text.len() as i32;
        self.blocks.push(TranscriptBlock {
            start: self.timestamp,
            end: self.timestamp + text_len,
            text,
        });
        self.timestamp += text_len;
        self
    }

    pub fn build(self) -> Transcript {
        Transcript {
            blocks: self.blocks,
        }
    }
}
