use hypr_calendar_interface::{Calendar, CalendarSource, Error, Event, EventFilter};

pub struct Handle;

impl Handle {
    pub fn new() -> Self {
        Handle
    }

    pub fn request_calendar_access(&mut self) {}
    pub fn request_contacts_access(&mut self) {}
}

impl CalendarSource for Handle {
    async fn list_calendars(&self) -> Result<Vec<Calendar>, Error> {
        Err(anyhow::anyhow!("Apple Calendar is only supported on macOS"))
    }

    async fn list_events(&self, _filter: EventFilter) -> Result<Vec<Event>, Error> {
        Err(anyhow::anyhow!("Apple Calendar is only supported on macOS"))
    }
}
