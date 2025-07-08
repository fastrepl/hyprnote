use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::future::Future;

pub use anyhow::Error;

pub trait CalendarSource {
    fn list_calendars(&self) -> impl Future<Output = Result<Vec<Calendar>, Error>>;
    fn list_events(&self, filter: EventFilter) -> impl Future<Output = Result<Vec<Event>, Error>>;
    fn get_event_participants(
        &self,
        event_tracking_id: String,
    ) -> impl Future<Output = Result<Vec<Participant>, Error>>;
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Platform {
    Apple,
    Google,
    Outlook,
}

impl std::fmt::Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Platform::Apple => write!(f, "Apple"),
            Platform::Google => write!(f, "Google"),
            Platform::Outlook => write!(f, "Outlook"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Calendar {
    pub id: String,
    pub platform: Platform,
    pub name: String,
    pub source: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Participant {
    pub name: String,
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventFilter {
    pub from: DateTime<Utc>,
    pub to: DateTime<Utc>,
    pub calendar_tracking_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Opener {
    AppleScript(String),
    Url(String),
}

impl Event {
    pub fn opener(&self) -> anyhow::Result<Opener> {
        match self.platform {
            Platform::Apple => {
                let script = String::from(
                    "
                    tell application \"Calendar\"
                        activate
                        switch view to month view
                        view calendar at current date
                    end tell
                ",
                );

                Ok(Opener::AppleScript(script))
            }
            Platform::Google => {
                let url = self.google_event_url.as_ref().unwrap().clone();
                Ok(Opener::Url(url))
            }
            Platform::Outlook => {
                anyhow::bail!("Outlook is not supported yet");
            }
        }
    }
}
