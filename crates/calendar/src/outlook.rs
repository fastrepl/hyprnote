use anyhow::Result;
use graph_rs_sdk::GraphClient;

use crate::{Calendar, CalendarSource, Event, EventFilter};

pub struct Handle {
    client: GraphClient,
}

impl Handle {
    pub async fn new(token: impl Into<String>) -> Self {
        let client = GraphClient::new(token.into());
        Self { client }
    }
}

impl CalendarSource for Handle {
    async fn list_calendars(&self) -> Result<Vec<Calendar>> {
        Ok(vec![])
    }

    async fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>> {
        Ok(vec![])
    }
}
