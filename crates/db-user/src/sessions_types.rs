use chrono::{DateTime, Utc};

use crate::user_common_derives;

user_common_derives! {
    pub struct Session {
        pub id: String,
        pub created_at: DateTime<Utc>,
        pub visited_at: DateTime<Utc>,
        pub user_id: String,
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
            created_at: {
                let str = row.get_str(1).expect("created_at");
                DateTime::parse_from_rfc3339(str)
                    .unwrap()
                    .with_timezone(&Utc)
            },
            visited_at: {
                let str = row.get_str(2).expect("visited_at");
                DateTime::parse_from_rfc3339(str)
                    .unwrap()
                    .with_timezone(&Utc)
            },
            user_id: row.get(3).expect("user_id"),
            calendar_event_id: row.get(4).expect("calendar_event_id"),
            title: row.get(5).expect("title"),
            audio_local_path: row.get(6).expect("audio_local_path"),
            audio_remote_path: row.get(7).expect("audio_remote_path"),
            raw_memo_html: row.get(8).expect("raw_memo_html"),
            enhanced_memo_html: row.get(9).expect("enhanced_memo_html"),
            conversations: row
                .get_str(10)
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
        pub transcripts: Vec<TranscriptChunk>,
        pub diarizations: Vec<DiarizationChunk>,
    }
}

user_common_derives! {
    pub enum GetSessionFilter {
        #[serde(rename = "id")]
        Id(String),
        #[serde(rename = "calendarEventId")]
        CalendarEventId(String),
        #[serde(rename = "tagId")]
        TagId(String),
    }
}

user_common_derives! {
    pub enum ListSessionFilter {
        #[serde(rename = "pagination")]
        Pagination {
            limit: u8,
            offset: u8,
        },
        #[serde(rename = "search")]
        Search((u8, String)),
        #[serde(rename = "recentlyVisited")]
        RecentlyVisited((u8,)),
        #[serde(rename = "dateRange")]
        DateRange((DateTime<Utc>, DateTime<Utc>)),
    }
}
