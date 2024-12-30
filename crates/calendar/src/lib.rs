use serde::{Deserialize, Serialize};
use std::future::Future;
use time::{serde::timestamp, OffsetDateTime};

pub mod google;

#[cfg(target_os = "macos")]
pub mod apple;

pub trait CalendarSource {
    fn list_calendars(&self) -> impl Future<Output = anyhow::Result<Vec<Calendar>>>;
    fn list_events(&self, filter: EventFilter) -> impl Future<Output = anyhow::Result<Vec<Event>>>;
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Calendar {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Event {
    pub id: String,
    pub name: String,
    pub note: String,
    pub participants: Vec<Participant>,
    #[serde(with = "timestamp")]
    pub start_date: OffsetDateTime,
    #[serde(with = "timestamp")]
    pub end_date: OffsetDateTime,
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
