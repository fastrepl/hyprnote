mod errors;
mod models;

pub use errors::*;
pub use models::*;

use graph_rs_sdk::GraphClient;

use hypr_calendar_interface::Calendar;

pub struct Handle {
    client: GraphClient,
}

impl Handle {
    pub async fn new(token: impl Into<String>) -> Self {
        let client = GraphClient::new(token.into());
        Self { client }
    }

    // https://learn.microsoft.com/en-us/graph/api/user-list-calendars
    pub async fn list_calendars(&self) -> Result<Vec<Calendar>, Error> {
        let _response = self
            .client
            .user("TODO_USER_ID")
            .calendars()
            .list_calendars()
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        Ok(vec![])
    }

    // https://learn.microsoft.com/en-us/graph/api/event-delta
    // https://learn.microsoft.com/en-us/graph/delta-query-events
    pub async fn delta_events(&self, calendar_id: &str) -> Result<Vec<()>, Error> {
        let _delta_2 = self
            .client
            .user("123")
            .calendar_views()
            .delta()
            .append_query_pair("startdatetime", "2016-12-01T00:00:00Z")
            .append_query_pair("enddatetime", "2016-12-30T00:00:00Z")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        Ok(vec![])
    }
}
