use chrono::{DateTime, Utc};

use crate::user_common_derives;

user_common_derives! {
    pub struct Session {
        pub id: String,
        pub timestamp: DateTime<Utc>,
        pub calendar_event_id: Option<String>,
        pub title: String,
        pub tags: Vec<String>,
        pub audio_local_path: Option<String>,
        pub audio_remote_path: Option<String>,
        pub raw_memo_html: String,
        pub enhanced_memo_html: Option<String>,
        pub conversations: Vec<ConversationChunk>,
    }
}

impl Session {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            timestamp: {
                let str = row.get_str(1).expect("timestamp");
                DateTime::parse_from_rfc3339(str)
                    .unwrap()
                    .with_timezone(&Utc)
            },
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
            conversations: row
                .get_str(9)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
        })
    }
}

impl Default for Session {
    fn default() -> Self {
        Session {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            calendar_event_id: None,
            title: "".to_string(),
            tags: vec![],
            audio_local_path: None,
            audio_remote_path: None,
            raw_memo_html: "".to_string(),
            enhanced_memo_html: None,
            conversations: vec![],
        }
    }
}

user_common_derives! {
    pub struct TranscriptChunk {
        pub start: u64,
        pub end: u64,
        pub text: String,
    }
}

user_common_derives! {
    pub struct DiarizationChunk {
        pub start: u64,
        pub end: u64,
        pub speaker: String,
    }
}

user_common_derives! {
    pub struct ConversationChunk {
        pub start: DateTime<Utc>,
        pub end: DateTime<Utc>,
        pub local_audio_path: String,
        pub remote_audio_path: String,
        pub transcripts: Vec<TranscriptChunk>,
        pub diarizations: Vec<DiarizationChunk>,
    }
}

user_common_derives! {
    pub enum GetSessionOption {
        #[serde(rename = "id")]
        Id(String),
        #[serde(rename = "calendarEventId")]
        CalendarEventId(String),
    }
}
