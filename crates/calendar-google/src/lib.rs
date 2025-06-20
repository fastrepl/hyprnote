// https://developers.google.com/calendar/api/v3/reference/calendars
// https://developers.google.com/calendar/api/v3/reference/events

use hypr_calendar_interface::{
    Calendar, CalendarSource, Error, Event, EventFilter, Participant, Platform,
};

pub struct Handle {
    client: google_calendar::Client,
}

impl Handle {
    pub async fn new(token: impl Into<String>) -> Self {
        let client = google_calendar::Client::new_from_env(token.into(), "".to_string()).await;
        Self { client }
    }
}

impl CalendarSource for Handle {
    async fn list_calendars(&self) -> Result<Vec<Calendar>, Error> {
        let list = self
            .client
            .calendar_list()
            .list_all(google_calendar::types::MinAccessRole::Noop, false, false)
            .await?
            .body
            .iter()
            .map(|calendar| Calendar {
                id: calendar.id.clone(),
                platform: Platform::Google,
                name: calendar.summary.clone(),
                source: Some(calendar.primary.to_string()),
            })
            .collect();

        Ok(list)
    }

    async fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, Error> {
        let events: Vec<Event> = self
            .client
            .events()
            .list(
                &filter.calendar_tracking_id,
                "",
                100,
                500,
                google_calendar::types::OrderBy::StartTime,
                "",
                &Vec::new(),
                "",
                &Vec::new(),
                false,
                false,
                true,
                &filter.from.to_rfc3339(),
                &filter.to.to_rfc3339(),
                "",
                "",
            )
            .await?
            .body
            .iter()
            .map(|event| {
                let start = event.start.clone().unwrap();
                let end = event.end.clone().unwrap();

                let start = start.date_time.unwrap_or_else(|| {
                    start
                        .date
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        .and_local_timezone(chrono::Local)
                        .unwrap()
                        .into()
                });
                let end = end.date_time.unwrap_or_else(|| {
                    end.date
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        .and_local_timezone(chrono::Local)
                        .unwrap()
                        .into()
                });

                let participants = event
                    .attendees
                    .iter()
                    .map(|a| Participant {
                        name: a.display_name.clone(),
                        email: Some(a.email.clone()),
                    })
                    .collect::<Vec<Participant>>();

                Event {
                    id: event.id.clone(),
                    calendar_id: filter.calendar_tracking_id.clone(),
                    platform: Platform::Google,
                    name: event.summary.clone(),
                    note: event.description.clone(),
                    participants,
                    start_date: start,
                    end_date: end,
                    google_event_url: Some(event.html_link.clone()),
                }
            })
            .collect();

        Ok(events)
    }

    async fn get_event_participants(
        &self,
        event_tracking_id: String,
    ) -> Result<Vec<Participant>, Error> {
        // Get all calendars to search for the event
        let calendars = self.list_calendars().await?;

        // Search for the event across all calendars
        for calendar in calendars {
            match self
                .client
                .events()
                .get(&calendar.id, &event_tracking_id, 0, "")
                .await
            {
                Ok(response) => {
                    let event = response.body;
                    let participants = event
                        .attendees
                        .iter()
                        .map(|a| Participant {
                            name: a.display_name.clone(),
                            email: Some(a.email.clone()),
                        })
                        .collect::<Vec<Participant>>();
                    return Ok(participants);
                }
                Err(_) => {
                    // Event not found in this calendar, continue searching
                    continue;
                }
            }
        }

        // Event not found in any calendar
        Ok(vec![])
    }
}
