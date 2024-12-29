// https://developers.google.com/calendar/api/v3/reference/calendars
// https://developers.google.com/calendar/api/v3/reference/events
pub use google_calendar::*;
use time::macros::format_description;

pub fn convert_to_time(
    date_time: google_calendar::types::EventDateTime,
) -> Option<time::OffsetDateTime> {
    let (date, date_time) = (date_time.date, date_time.date_time);

    match (date, date_time) {
        (_, Some(date_time)) => {
            let t = date_time.timestamp();
            time::OffsetDateTime::from_unix_timestamp(t).ok()
        }
        (Some(date), None) => {
            let formatted = date.format("%Y-%m-%d").to_string();
            let description = format_description!("[year]-[month]-[day]");
            let pared = time::OffsetDateTime::parse(&formatted, description).unwrap();
            Some(pared)
        }
        _ => None,
    }
}
