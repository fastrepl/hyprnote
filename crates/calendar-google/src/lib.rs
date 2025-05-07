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
        let mut all_events = Vec::new();

        for calendar in filter.calendars {
            let events: Vec<Event> = self
                .client
                .events()
                .list(
                    &calendar.id,
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
                        calendar_id: calendar.id.clone(),
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

            all_events.extend(events);
        }

        Ok(all_events)
    }
}
