use serde::{Deserialize, Serialize};
use std::future::Future;

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
    pub start_date: time::OffsetDateTime,
    pub end_date: time::OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct EventFilter {
    pub calendar_id: String,
    pub from: time::OffsetDateTime,
    pub to: time::OffsetDateTime,
}
