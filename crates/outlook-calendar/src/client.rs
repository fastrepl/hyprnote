use std::collections::HashSet;

use anlg_http::HttpClient;

use crate::error::Error;
use crate::types::{
    CreateEventRequest, Event, ListCalendarsResponse, ListEventsRequest, ListEventsResponse,
};

const MAX_PAGES: usize = 1_000;

pub struct OutlookCalendarClient<C> {
    http: C,
}

impl<C: HttpClient> OutlookCalendarClient<C> {
    pub fn new(http: C) -> Self {
        Self { http }
    }

    pub async fn list_calendars(&self) -> Result<ListCalendarsResponse, Error> {
        let bytes = self.http.get("/me/calendars").await.map_err(Error::Http)?;
        let mut response: ListCalendarsResponse = serde_json::from_slice(&bytes)?;
        let mut seen = HashSet::new();
        while let Some(link) = response.odata_next_link.take() {
            let path = next_page_path(&link, "/me/calendars", &mut seen)?;
            let bytes = self.http.get(path).await.map_err(Error::Http)?;
            let page: ListCalendarsResponse = serde_json::from_slice(&bytes)?;
            response.value.extend(page.value);
            response.odata_next_link = page.odata_next_link;
        }
        Ok(response)
    }

    pub async fn list_events(&self, req: ListEventsRequest) -> Result<ListEventsResponse, Error> {
        let calendar_id = &req.calendar_id;

        let use_calendar_view = req.start_date_time.is_some() && req.end_date_time.is_some();

        let base_path = if use_calendar_view {
            format!("/me/calendars/{calendar_id}/calendarView")
        } else {
            format!("/me/calendars/{calendar_id}/events")
        };

        let mut query_parts: Vec<String> = Vec::new();

        if let Some(ref start) = req.start_date_time {
            query_parts.push(format!(
                "startDateTime={}",
                urlencoding::encode(&start.to_rfc3339())
            ));
        }
        if let Some(ref end) = req.end_date_time {
            query_parts.push(format!(
                "endDateTime={}",
                urlencoding::encode(&end.to_rfc3339())
            ));
        }
        if let Some(top) = req.top {
            query_parts.push(format!("$top={top}"));
        }
        if let Some(skip) = req.skip {
            query_parts.push(format!("$skip={skip}"));
        }
        if let Some(ref filter) = req.filter {
            query_parts.push(format!("$filter={}", urlencoding::encode(filter)));
        }
        if let Some(ref select) = req.select {
            query_parts.push(format!("$select={}", select.join(",")));
        }
        if let Some(ref order_by) = req.order_by {
            query_parts.push(format!("$orderby={}", urlencoding::encode(order_by)));
        }

        let full_path = if query_parts.is_empty() {
            base_path.clone()
        } else {
            format!("{}?{}", base_path, query_parts.join("&"))
        };

        let bytes = self.http.get(&full_path).await.map_err(Error::Http)?;
        let mut response: ListEventsResponse = serde_json::from_slice(&bytes)?;
        // Explicit limits retain the public API's bounded page and continuation link.
        if req.top.is_some() {
            return Ok(response);
        }
        let mut seen = HashSet::new();
        while let Some(link) = response.odata_next_link.take() {
            let path = next_page_path(&link, &base_path, &mut seen)?;
            let bytes = self.http.get(path).await.map_err(Error::Http)?;
            let page: ListEventsResponse = serde_json::from_slice(&bytes)?;
            response.value.extend(page.value);
            response.odata_next_link = page.odata_next_link;
        }
        Ok(response)
    }

    pub async fn create_event(&self, req: CreateEventRequest) -> Result<Event, Error> {
        let calendar_id = &req.calendar_id;
        let path = format!("/me/calendars/{calendar_id}/events");

        let body = serde_json::to_vec(&req.event)?;
        let bytes = self
            .http
            .post(&path, body, "application/json")
            .await
            .map_err(Error::Http)?;
        let event: Event = serde_json::from_slice(&bytes)?;
        Ok(event)
    }
}

fn next_page_path<'a>(
    link: &'a str,
    collection_path: &str,
    seen: &mut HashSet<String>,
) -> Result<&'a str, Error> {
    // Keep Graph's opaque query intact, but never send the connection to another resource.
    let path = link
        .strip_prefix("https://graph.microsoft.com/v1.0")
        .filter(|path| {
            path.split_once('?').is_some_and(|(resource, query)| {
                resource == collection_path && !query.is_empty() && !path.contains('#')
            })
        })
        .ok_or(Error::InvalidNextLink)?;
    if seen.len() >= MAX_PAGES - 1 {
        return Err(Error::TooManyPages);
    }
    if !seen.insert(path.to_string()) {
        return Err(Error::RepeatedNextLink);
    }
    Ok(path)
}

#[cfg(test)]
mod tests;
