// https://developers.google.com/calendar/api/v3/reference/calendars
// https://developers.google.com/calendar/api/v3/reference/events
pub use google_calendar::*;
use time_tz::{timezones, Offset, TimeZone};

pub struct Handle {
    client: google_calendar::Client,
}

impl Handle {
    pub fn new(client: google_calendar::Client) -> Self {
        Self { client }
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
