use chrono::{DateTime, Utc};

use crate::user_common_derives;

user_common_derives! {
    pub struct Event {
        pub id: String,
        pub tracking_id: String,
        pub calendar_id: String,
        pub name: String,
        pub note: String,
        pub start_date: DateTime<Utc>,
        pub end_date: DateTime<Utc>,
        pub google_event_url: Option<String>,
    }
}

impl From<hypr_calendar::Event> for Event {
    fn from(event: hypr_calendar::Event) -> Self {
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: event.id,
            calendar_id: event.calendar_id,
            name: event.name,
            note: event.note,
            start_date: event.start_date,
            end_date: event.end_date,
            google_event_url: event.google_event_url,
        }
    }
}
