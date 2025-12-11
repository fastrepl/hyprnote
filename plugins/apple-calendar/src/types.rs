use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

macro_rules! common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
        $item
    };
}

common_derives! {
    pub enum Platform {
        Apple,
    }
}

impl std::fmt::Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Platform::Apple => write!(f, "Apple"),
        }
    }
}

common_derives! {
    pub struct Calendar {
        pub id: String,
        pub platform: Platform,
        pub name: String,
        pub source: Option<String>,
    }
}

common_derives! {
    pub struct Event {
        pub id: String,
        pub calendar_id: String,
        pub platform: Platform,
        pub name: String,
        pub note: String,
        pub participants: Vec<Participant>,
        pub start_date: DateTime<Utc>,
        pub end_date: DateTime<Utc>,
        pub google_event_url: Option<String>,
        pub recurrence: Option<RecurrenceInfo>,
    }
}

common_derives! {
    pub struct RecurrenceInfo {
        pub series_id: String,
        pub occurrence_date: DateTime<Utc>,
        pub is_detached: bool,
        pub rule: Option<RecurrenceRule>,
    }
}

common_derives! {
    pub struct RecurrenceRule {
        pub frequency: RecurrenceFrequency,
        pub interval: u32,
        pub end: Option<RecurrenceEnd>,
    }
}

common_derives! {
    pub enum RecurrenceFrequency {
        Daily,
        Weekly,
        Monthly,
        Yearly,
    }
}

common_derives! {
    pub enum RecurrenceEnd {
        Date(DateTime<Utc>),
        Count(u32),
    }
}

common_derives! {
    pub struct Participant {
        pub name: String,
        pub email: Option<String>,
    }
}

common_derives! {
    pub struct EventFilter {
        pub from: DateTime<Utc>,
        pub to: DateTime<Utc>,
        pub calendar_tracking_id: String,
    }
}
