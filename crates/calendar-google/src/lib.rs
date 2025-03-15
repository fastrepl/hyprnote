// https://developers.google.com/calendar/api/v3/reference/calendars
// https://developers.google.com/calendar/api/v3/reference/events

use google_calendar3::{
    api::{CalendarListEntry, Event},
    hyper_rustls::{self, HttpsConnector},
    hyper_util::{self, client::legacy::connect::HttpConnector},
    CalendarHub,
};

mod auth;
mod errors;

pub use errors::*;

pub struct Handle {
    hub: CalendarHub<HttpsConnector<HttpConnector>>,
}

// impl CalendarSource for Handle {
impl Handle {
    pub async fn new() -> Result<Self, crate::Error> {
        let client =
            hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
                .build(
                    hyper_rustls::HttpsConnectorBuilder::new()
                        .with_native_roots()
                        .unwrap()
                        .https_or_http()
                        .enable_http1()
                        .build(),
                );

        let auth = crate::auth::Storage {};
        let hub = CalendarHub::new(client, auth);

        Ok(Self { hub })
    }
}

impl Handle {
    pub async fn list_calendars(&self) -> Result<Vec<CalendarListEntry>, crate::Error> {
        let (_res, calendar_list) = self.hub.calendar_list().list().doit().await?;
        let calendars = calendar_list.items.unwrap_or_default();
        Ok(calendars)
    }
    // https://developers.google.com/calendar/api/guides/sync
    pub async fn list_events(
        &self,
        calendar_id: impl AsRef<str>,
    ) -> Result<Vec<Event>, crate::Error> {
        let (_res, events_wrapper) = self
            .hub
            .events()
            .list(calendar_id.as_ref())
            .updated_min(chrono::Utc::now())
            .time_min(chrono::Utc::now())
            .time_max(chrono::Utc::now())
            .sync_token("At")
            .single_events(false)
            .show_hidden_invitations(false)
            .show_deleted(false)
            .order_by("erat")
            .max_results(500)
            .max_attendees(100)
            .always_include_email(true)
            .doit()
            .await?;

        let _next_sync_token = events_wrapper.next_sync_token;
        let events = events_wrapper.items.unwrap_or_default();
        Ok(events)
    }
}
