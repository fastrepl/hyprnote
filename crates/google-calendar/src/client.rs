use hypr_nango::{NangoClient, NangoIntegration};

use crate::error::Error;
use crate::types::{ListEventsRequest, ListEventsResponse};

pub struct GoogleCalendarClient<'a> {
    nango: &'a NangoClient,
    connection_id: String,
}

impl<'a> GoogleCalendarClient<'a> {
    pub fn new(nango: &'a NangoClient, connection_id: impl Into<String>) -> Self {
        Self {
            nango,
            connection_id: connection_id.into(),
        }
    }

    pub async fn list_events(&self, req: ListEventsRequest) -> Result<ListEventsResponse, Error> {
        let calendar_id = &req.calendar_id;
        let path = format!("/calendar/v3/calendars/{calendar_id}/events");

        let mut query_parts: Vec<String> = Vec::new();

        if let Some(ref time_min) = req.time_min {
            query_parts.push(format!("timeMin={}", time_min.to_rfc3339()));
        }
        if let Some(ref time_max) = req.time_max {
            query_parts.push(format!("timeMax={}", time_max.to_rfc3339()));
        }
        if let Some(max_results) = req.max_results {
            query_parts.push(format!("maxResults={max_results}"));
        }
        if let Some(ref page_token) = req.page_token {
            query_parts.push(format!("pageToken={page_token}"));
        }
        if let Some(single_events) = req.single_events {
            query_parts.push(format!("singleEvents={single_events}"));
        }
        if let Some(ref order_by) = req.order_by {
            query_parts.push(format!("orderBy={order_by}"));
        }

        let full_path = if query_parts.is_empty() {
            path
        } else {
            format!("{}?{}", path, query_parts.join("&"))
        };

        let response = self
            .nango
            .for_connection(NangoIntegration::GoogleCalendar, &self.connection_id)
            .get(&full_path)?
            .send()
            .await?;

        let body = response.error_for_status()?.json().await?;
        Ok(body)
    }
}
