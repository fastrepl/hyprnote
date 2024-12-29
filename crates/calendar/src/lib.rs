pub mod google;

#[cfg(target_os = "macos")]
pub mod apple;

pub struct Calendar {
    pub id: String,
    pub name: String,
}

pub struct Event {
    pub id: String,
    pub name: String,
    pub start_date: time::OffsetDateTime,
    pub end_date: time::OffsetDateTime,
}

impl From<google::types::Calendar> for Calendar {
    fn from(calendar: google::types::Calendar) -> Self {
        Self {
            id: calendar.id,
            name: calendar.summary,
        }
    }
}

impl From<apple::Calendar> for Calendar {
    fn from(calendar: apple::Calendar) -> Self {
        Self {
            id: calendar.id,
            name: calendar.title,
        }
    }
}

impl From<google::types::Event> for Event {
    fn from(event: google::types::Event) -> Self {
        Self {
            id: event.id,
            name: event.summary,
            start_date: google::convert_to_time(event.start.unwrap()).unwrap(),
            end_date: google::convert_to_time(event.end.unwrap()).unwrap(),
        }
    }
}

impl From<apple::Event> for Event {
    fn from(event: apple::Event) -> Self {
        Self {
            id: event.id,
            name: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
        }
    }
}
