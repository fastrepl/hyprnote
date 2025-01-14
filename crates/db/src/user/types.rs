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

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Calendar {
    pub id: String,
    pub tracking_id: String,
    pub platform: Platform,
    pub name: String,
    pub selected: bool,
}

impl From<hypr_calendar::Calendar> for Calendar {
    fn from(calendar: hypr_calendar::Calendar) -> Self {
        Calendar {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: calendar.id,
            platform: calendar.platform.into(),
            name: calendar.name,
            selected: false,
        }
    }
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub struct Event {
    pub id: String,
    pub tracking_id: String,
    pub calendar_id: String,
    pub platform: Platform,
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
            platform: event.platform.into(),
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

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, specta::Type)]
pub enum Platform {
    Apple,
    Google,
}

impl From<hypr_calendar::Platform> for Platform {
    fn from(platform: hypr_calendar::Platform) -> Self {
        match platform {
            hypr_calendar::Platform::Apple => Platform::Apple,
            hypr_calendar::Platform::Google => Platform::Google,
        }
    }
}

impl std::fmt::Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Platform::Apple => write!(f, "Apple"),
            Platform::Google => write!(f, "Google"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Template {
    pub id: String,
    pub title: String,
    pub description: String,
    pub sections: Vec<TemplateSection>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct TemplateSection {
    pub title: String,
    pub description: String,
}

impl Template {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            title: row.get(1).expect("title"),
            description: row.get(2).expect("description"),
            sections: serde_json::from_str(row.get_str(3).expect("sections")).unwrap(),
        })
    }
}
