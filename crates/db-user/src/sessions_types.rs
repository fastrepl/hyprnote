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
        pub raw_memo_html: String,
        pub enhanced_memo_html: Option<String>,
        #[specta(skip)]
        #[serde(skip)]
        pub conversations: Vec<()>,
        pub words: Vec<hypr_listener_interface::Word>,
        pub record_start: Option<DateTime<Utc>>,
        pub record_end: Option<DateTime<Utc>>,
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
            raw_memo_html: row.get(6).expect("raw_memo_html"),
            enhanced_memo_html: row.get(7).expect("enhanced_memo_html"),
            conversations: vec![],
            words: row
                .get_str(9)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap(),
            record_start: row.get_str(10).ok().and_then(|str| {
                DateTime::parse_from_rfc3339(str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .ok()
            }),
            record_end: row.get_str(11).ok().and_then(|str| {
                DateTime::parse_from_rfc3339(str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .ok()
            }),
        })
    }

    pub fn is_empty(&self) -> bool {
        self.enhanced_memo_html
            .as_ref()
            .is_none_or(|s| s.is_empty())
            && self.raw_memo_html.is_empty()
            && self.words.is_empty()
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
    pub struct ListSessionFilter {
        #[serde(flatten)]
        pub common: ListSessionFilterCommon,
        #[serde(flatten)]
        pub specific: ListSessionFilterSpecific,
    }
}

user_common_derives! {
    pub struct ListSessionFilterCommon {
        pub user_id: String,
        pub limit: Option<u8>,
    }
}

user_common_derives! {
    #[serde(tag = "type")]
    pub enum ListSessionFilterSpecific {
        #[serde(rename = "search")]
        Search { query: String },
        #[serde(rename = "recentlyVisited")]
        RecentlyVisited {},
        #[serde(rename = "dateRange")]
        DateRange { start: DateTime<Utc>, end: DateTime<Utc> },
    }
}
