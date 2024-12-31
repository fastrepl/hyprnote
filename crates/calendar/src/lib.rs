use serde::{Deserialize, Serialize};
use std::future::Future;
use time::{serde::timestamp, OffsetDateTime};

#[cfg(feature = "google")]
pub mod google;

#[cfg(feature = "apple")]
#[cfg(target_os = "macos")]
pub mod apple;

pub trait CalendarSource {
    fn list_calendars(&self) -> impl Future<Output = anyhow::Result<Vec<Calendar>>>;
    fn list_events(&self, filter: EventFilter) -> impl Future<Output = anyhow::Result<Vec<Event>>>;
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub enum Platform {
    Apple,
    Google,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Calendar {
    pub id: String,
    pub platform: Platform,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Event {
    pub id: String,
    pub platform: Platform,
    pub name: String,
    pub note: String,
    pub participants: Vec<Participant>,
    #[serde(with = "timestamp")]
    pub start_date: OffsetDateTime,
    #[serde(with = "timestamp")]
    pub end_date: OffsetDateTime,
    #[serde(skip)]
    apple_calendar_id: Option<String>,
    #[serde(skip)]
    google_event_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Participant {
    pub name: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct EventFilter {
    pub calendar_id: String,
    #[serde(with = "timestamp")]
    pub from: OffsetDateTime,
    #[serde(with = "timestamp")]
    pub to: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
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
        }
    }
}
