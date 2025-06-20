use graph_rs_sdk::GraphClient;

use hypr_calendar_interface::{Calendar, CalendarSource, Error, Event, EventFilter, Participant};

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
    async fn list_calendars(&self) -> Result<Vec<Calendar>, Error> {
        Ok(vec![])
    }

    async fn list_events(&self, _filter: EventFilter) -> Result<Vec<Event>, Error> {
        Ok(vec![])
    }

    async fn get_event_participants(
        &self,
        event_tracking_id: String,
    ) -> Result<Vec<Participant>, Error> {
        // Get the specific event using Microsoft Graph API
        let response = self
            .client
            .me()
            .event(&event_tracking_id)
            .get_events()
            .send()
            .await?;

        // Parse the JSON response
        let event: serde_json::Value = response.json().await?;

        // Extract attendees from the event
        let participants =
            if let Some(attendees) = event.get("attendees").and_then(|a| a.as_array()) {
                attendees
                    .iter()
                    .filter_map(|attendee| {
                        let email_address = attendee.get("emailAddress")?;
                        let name = email_address
                            .get("name")?
                            .as_str()
                            .unwrap_or_default()
                            .to_string();
                        let email = email_address
                            .get("address")?
                            .as_str()
                            .unwrap_or_default()
                            .to_string();

                        Some(Participant {
                            name,
                            email: Some(email),
                        })
                    })
                    .collect()
            } else {
                vec![]
            };

        Ok(participants)
    }
}
