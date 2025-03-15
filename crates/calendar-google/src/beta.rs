use google_calendar3::{
    api::Channel,
    hyper_rustls::{self, HttpsConnector},
    hyper_util::{self, client::legacy::connect::HttpConnector},
    yup_oauth2, CalendarHub,
};

pub struct Handle {
    hub: CalendarHub<HttpsConnector<HttpConnector>>,
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

        let secret: yup_oauth2::ApplicationSecret = Default::default();

        let auth = yup_oauth2::InstalledFlowAuthenticator::builder(
            secret,
            yup_oauth2::InstalledFlowReturnMethod::HTTPRedirect,
        )
        .build()
        .await
        .unwrap();

        let hub = CalendarHub::new(client, auth);

        Ok(Self { hub })
    }
}

impl Handle {
    pub async fn list_calendars(&self) -> Result<Vec<()>, crate::Error> {
        Ok(vec![])
    }
    // https://developers.google.com/calendar/api/guides/sync
    pub async fn list_events(&self) -> Result<Vec<()>, crate::Error> {
        // let mut req = Channel::default();

        let (_res, _events) = self
            .hub
            .events()
            .list("calendarId")
            .updated_min(chrono::Utc::now())
            .time_zone("et")
            .time_min(chrono::Utc::now())
            .time_max(chrono::Utc::now())
            .sync_token("At")
            .single_events(false)
            .show_hidden_invitations(false)
            .show_deleted(false)
            .order_by("erat")
            .max_results(500)
            .max_attendees(100)
            .add_event_types("Lorem")
            .always_include_email(true)
            .doit()
            .await?;

        Ok(vec![])
    }
}
