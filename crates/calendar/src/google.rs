// https://developers.google.com/calendar/api/v3/reference/calendars
// https://developers.google.com/calendar/api/v3/reference/events

use crate::{Calendar, CalendarSource, Event, EventFilter};
use anyhow::Result;
use time::format_description::well_known::Rfc3339;
use time_tz::{timezones, Offset, TimeZone};

pub use google_calendar::*;

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
    async fn list_calendars(&self) -> Result<Vec<Calendar>> {
        let list = self
            .client
            .calendar_list()
            .list_all(google_calendar::types::MinAccessRole::Noop, false, false)
            .await?
            .body
            .iter()
            .map(|calendar| Calendar {
                id: calendar.id.clone(),
                name: calendar.summary.clone(),
            })
            .collect();

        Ok(list)
    }

    async fn list_events(&self, filter: EventFilter) -> anyhow::Result<Vec<crate::Event>> {
        let events = self
            .client
            .events()
            .list(
                &filter.calendar_id,
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
                filter.from.format(&Rfc3339)?.as_str(),
                filter.to.format(&Rfc3339)?.as_str(),
                "",
                "",
            )
            .await?
            .body
            .iter()
            .map(|event| {
                let start = convert_to_time(event.start.clone().unwrap()).unwrap();
                let end = convert_to_time(event.end.clone().unwrap()).unwrap();

                Event {
                    id: event.id.clone(),
                    name: event.summary.clone(),
                    note: event.description.clone(),
                    participants: Vec::new(),
                    start_date: start,
                    end_date: end,
                }
            })
            .collect();
        Ok(events)
    }
}

pub fn convert_to_time(
    date_time: google_calendar::types::EventDateTime,
) -> Option<time::OffsetDateTime> {
    let (date, time_zone, date_time) = (date_time.date, date_time.time_zone, date_time.date_time);

    match (date, time_zone, date_time) {
        (_, _, Some(date_time)) => {
            let t = date_time.timestamp();
            time::OffsetDateTime::from_unix_timestamp(t).ok()
        }
        (Some(dt), tz, None) => {
            let date = time::Date::parse(
                &dt.format("%Y-%m-%d").to_string(),
                &time::macros::format_description!("[year]-[month]-[day]"),
            )
            .unwrap();

            let time_zone = timezones::get_by_name(&tz).unwrap();
            let offset = time_zone
                .get_offset_utc(&date.midnight().assume_utc())
                .to_utc();

            let dt = time::OffsetDateTime::new_in_offset(date, time::Time::MIDNIGHT, offset);
            Some(dt)
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use google_calendar::types::EventDateTime;
    use time::format_description::well_known::Rfc3339;

    #[test]
    fn test_convert_to_time() {
        let time_zone = "Asia/Seoul".to_string();

        assert_eq!(
            "2024-12-29T00:00:00+09:00",
            convert_to_time(EventDateTime {
                time_zone: time_zone.clone(),
                date: chrono::NaiveDate::from_ymd_opt(2024, 12, 29),
                date_time: None,
            })
            .unwrap()
            .format(&Rfc3339)
            .unwrap(),
        );

        assert_eq!(
            "2024-12-28T15:00:00Z",
            convert_to_time(EventDateTime {
                time_zone: time_zone.clone(),
                date: None,
                date_time: Some(
                    chrono::DateTime::parse_from_rfc3339("2024-12-29T00:00:00+09:00")
                        .unwrap()
                        .to_utc()
                ),
            })
            .unwrap()
            .format(&Rfc3339)
            .unwrap(),
        );
    }
}
