use std::{future::Future, pin::Pin};

use google_calendar3::{
    api::{CalendarListEntry, Channel, Event},
    common::GetToken,
    hyper_rustls::{self, HttpsConnector},
    hyper_util::{self, client::legacy::connect::HttpConnector},
    CalendarHub,
};

pub struct Handle {
    hub: CalendarHub<HttpsConnector<HttpConnector>>,
}

#[derive(Debug, Clone)]
struct Storage {}

type GetTokenOutput<'a> = Pin<
    Box<
        dyn Future<Output = Result<Option<String>, Box<dyn std::error::Error + Send + Sync>>>
            + Send
            + 'a,
    >,
>;

impl GetToken for Storage {
    fn get_token<'a>(&'a self, _scopes: &'a [&str]) -> GetTokenOutput<'a> {
        Box::pin(async move { Ok(Some("your_oauth_token_here".to_string())) })
    }
}

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

        let auth = Storage {};
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
        // let mut req = Channel::default();

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

        let events = events_wrapper.items.unwrap_or_default();
        Ok(events)
    }
}
