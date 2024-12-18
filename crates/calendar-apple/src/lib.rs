use block2::RcBlock;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

use objc2::{rc::Retained, runtime::Bool};
use objc2_event_kit::{EKCalendar, EKEventStore, EKEventStoreRequestAccessCompletionHandler};
use objc2_foundation::{NSArray, NSDate, NSError, NSPredicate};

pub struct Handle {
    store: Retained<EKEventStore>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Calendar {
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct Event {
    pub title: String,
    pub start_date: time::OffsetDateTime,
    pub end_date: time::OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct EventFilter {
    pub last_n_days: Option<u32>,
    pub calendar_titles: Vec<String>,
}

impl Handle {
    pub fn new() -> Self {
        let store = unsafe { EKEventStore::new() };

        let completion = RcBlock::new(move |_granted: Bool, _error: *mut NSError| {});
        let completion_ptr: EKEventStoreRequestAccessCompletionHandler =
            &*completion as *const _ as *mut _;
        unsafe { store.requestFullAccessToEventsWithCompletion(completion_ptr) };

        Self { store }
    }

    pub fn list_calendars(&self) -> Vec<Calendar> {
        let calendars = unsafe { self.store.calendars() };
        calendars
            .iter()
            .map(|calendar| {
                let title = unsafe { calendar.title() };
                Calendar {
                    title: title.to_string(),
                }
            })
            .sorted_by(|a, b| a.title.cmp(&b.title))
            .collect()
    }

    pub fn list_events(&self, filter: EventFilter) -> Vec<Event> {
        let predicate = self.events_predicate(&filter);
        let events = unsafe { self.store.eventsMatchingPredicate(&predicate) };

        events
            .iter()
            .filter_map(|event| {
                let title = unsafe { event.title() };
                let start_date = unsafe { event.startDate() };
                let end_date = unsafe { event.endDate() };
                let calendar = unsafe { event.calendar() }.unwrap();
                let calendar_title = unsafe { calendar.title() };

                // This is theoretically not needed, but it seems like the 'calendars' filter does not work in the predicate.
                if !filter.calendar_titles.contains(&calendar_title.to_string()) {
                    return None;
                }

                Some(Event {
                    title: title.to_string(),
                    start_date: offset_date_time_from(start_date),
                    end_date: offset_date_time_from(end_date),
                })
            })
            .sorted_by(|a, b| a.start_date.cmp(&b.start_date))
            .collect()
    }

    fn events_predicate(&self, filter: &EventFilter) -> Retained<NSPredicate> {
        let start_date = unsafe { NSDate::new() };
        let end_date = unsafe {
            start_date.dateByAddingTimeInterval(
                filter.last_n_days.unwrap_or(30) as f64 * 24.0 * 60.0 * 60.0,
            )
        };

        let calendars = unsafe { self.store.calendars() };
        let calendars: Retained<NSArray<EKCalendar>> = calendars
            .into_iter()
            .filter(|c| {
                let title = unsafe { c.title() };
                filter.calendar_titles.contains(&title.to_string())
            })
            .collect();

        let predicate = unsafe {
            self.store
                .predicateForEventsWithStartDate_endDate_calendars(
                    &start_date,
                    &end_date,
                    Some(&calendars),
                )
        };

        predicate
    }
}

fn offset_date_time_from(date: Retained<NSDate>) -> time::OffsetDateTime {
    let seconds = unsafe { date.timeIntervalSinceReferenceDate() };

    let cocoa_reference = time::Date::from_calendar_date(2001, time::Month::January, 1)
        .unwrap()
        .with_hms(0, 0, 0)
        .unwrap()
        .assume_utc();

    let unix_timestamp = seconds + cocoa_reference.unix_timestamp() as f64;

    time::OffsetDateTime::from_unix_timestamp(unix_timestamp as i64).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time() {
        let now = unsafe { NSDate::new() };
        let now_from_nsdate = offset_date_time_from(now.to_owned());
        let now_from_time = time::OffsetDateTime::now_utc();
        let diff = (now_from_nsdate - now_from_time).abs();
        assert!(diff.whole_seconds() < 1);
    }

    #[test]
    fn test_list_calendars() {
        let handle = Handle::new();
        let _ = handle.list_calendars();
    }

    #[test]
    fn test_list_events() {
        let handle = Handle::new();
        let filter = EventFilter {
            last_n_days: Some(100),
            calendar_titles: vec!["something_not_exist".to_string()],
        };
        let events = handle.list_events(filter);
        assert_eq!(events.len(), 0);
    }
}
