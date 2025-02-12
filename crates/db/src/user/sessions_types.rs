use chrono::{DateTime, Utc};

use crate::user_common_derives;

user_common_derives! {
    pub struct Session {
        pub id: String,
        pub user_id: String,
        pub timestamp: DateTime<Utc>,
        pub calendar_event_id: Option<String>,
        pub title: String,
        pub audio_local_path: Option<String>,
        pub audio_remote_path: Option<String>,
        pub raw_memo_html: String,
        pub enhanced_memo_html: Option<String>,
        pub conversations: Vec<ConversationChunk>,
    }
}

impl Session {
    pub fn from_row(row: &libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            user_id: row.get(1).expect("user_id"),
            timestamp: {
                let str = row.get_str(2).expect("timestamp");
                DateTime::parse_from_rfc3339(str)
                    .unwrap()
                    .with_timezone(&Utc)
            },
            calendar_event_id: row.get(3).expect("calendar_event_id"),
            title: row.get(4).expect("title"),
            audio_local_path: row.get(5).expect("audio_local_path"),
            audio_remote_path: row.get(6).expect("audio_remote_path"),
            raw_memo_html: row.get(7).expect("raw_memo_html"),
            enhanced_memo_html: row.get(8).expect("enhanced_memo_html"),
            conversations: row
                .get_str(9)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
        })
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
    pub enum SessionFilter {
        #[serde(rename = "id")]
        Id(String),
        #[serde(rename = "calendarEventId")]
        CalendarEventId(String),
        #[serde(rename = "tagId")]
        TagId(String),
    }
}
