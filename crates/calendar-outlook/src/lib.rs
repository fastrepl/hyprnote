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
        // Get the specific event using Microsoft Graph API with proper error handling
        let response = match self
            .client
            .me()
            .event(&event_tracking_id)
            .get_events()
            .send()
            .await
        {
            Ok(response) => response,
            Err(err) => {
                let error_string = err.to_string().to_lowercase();

                // Check if this is a "not found" error (HTTP 404 or similar)
                if error_string.contains("404")
                    || error_string.contains("not found")
                    || error_string.contains("notfound")
                    || error_string.contains("event not found")
                {
                    // Event not found, return empty vector to align with Apple/Google implementations
                    return Ok(vec![]);
                } else {
                    // This is a more serious error (network, API limits, auth, etc.)
                    tracing::warn!(
                        "Error accessing Outlook event '{}': {}",
                        event_tracking_id,
                        err
                    );
                    return Ok(vec![]);
                }
            }
        };

        // Parse the JSON response with proper error handling
        let event: serde_json::Value = match response.json().await {
            Ok(event) => event,
            Err(err) => {
                tracing::warn!(
                    "Failed to parse JSON response for event '{}': {}",
                    event_tracking_id,
                    err
                );
                return Ok(vec![]);
            }
        };

        // Validate response structure and extract attendees
        let participants = match event.get("attendees") {
            Some(attendees_value) => {
                match attendees_value.as_array() {
                    Some(attendees) => {
                        attendees
                            .iter()
                            .filter_map(|attendee| {
                                // Validate attendee structure before parsing
                                let email_address = attendee.get("emailAddress")?;

                                let name = email_address
                                    .get("name")
                                    .and_then(|n| n.as_str())
                                    .unwrap_or_default()
                                    .to_string();

                                let email_str = email_address
                                    .get("address")
                                    .and_then(|e| e.as_str())
                                    .unwrap_or_default()
                                    .to_string();

                                // Set email to None if empty string, otherwise Some(email)
                                let email = if email_str.trim().is_empty() {
                                    None
                                } else {
                                    Some(email_str)
                                };

                                Some(Participant { name, email })
                            })
                            .collect()
                    }
                    None => {
                        tracing::debug!(
                            "Attendees field is not an array for event '{}'",
                            event_tracking_id
                        );
                        vec![]
                    }
                }
            }
            None => {
                // No attendees field in response, which is valid
                vec![]
            }
        };

        Ok(participants)
    }
}
