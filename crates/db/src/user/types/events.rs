use serde::{Deserialize, Serialize};
use time::{serde::rfc3339, OffsetDateTime};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Event {
    pub id: String,
    pub tracking_id: String,
    pub calendar_id: String,
    pub name: String,
    pub note: String,
    #[serde(with = "rfc3339")]
    pub start_date: OffsetDateTime,
    #[serde(with = "rfc3339")]
    pub end_date: OffsetDateTime,
    pub google_event_url: Option<String>,
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

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Participant {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub color_hex: String,
}

impl From<hypr_calendar::Participant> for Participant {
    fn from(participant: hypr_calendar::Participant) -> Self {
        Participant {
            id: uuid::Uuid::new_v4().to_string(),
            name: participant.name,
            email: participant.email,
            color_hex: random_color::RandomColor::new().to_hex(),
        }
    }
}

impl Default for Participant {
    fn default() -> Self {
        Participant {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Unknown".to_string(),
            email: None,
            color_hex: random_color::RandomColor::new().to_hex(),
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type)]
pub enum ParticipantFilter {
    Text(String),
    Event(String),
    All,
}
