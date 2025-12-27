use std::panic::AssertUnwindSafe;
use std::time::Duration;

use backon::{BlockingRetryable, ConstantBuilder};
use itertools::Itertools;
use objc2::{AllocAnyThread, rc::Retained};
use objc2_event_kit::{EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore};
use objc2_foundation::{NSArray, NSDate};

use crate::error::Error;
use crate::types::EventFilter;
use crate::types::{AppleCalendar, AppleEvent};

use super::transforms::{transform_calendar, transform_event};

fn retry_backoff() -> ConstantBuilder {
    ConstantBuilder::default()
        .with_delay(Duration::from_millis(100))
        .with_max_times(3)
}

pub struct Handle;

impl Handle {
    fn create_event_store() -> Retained<EKEventStore> {
        unsafe { EKEventStore::new() }
    }
}

impl Handle {
    fn has_calendar_access() -> bool {
        let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
        matches!(status, EKAuthorizationStatus::FullAccess)
    }

    fn fetch_events(
        event_store: &EKEventStore,
        filter: &EventFilter,
    ) -> Result<Retained<NSArray<EKEvent>>, Error> {
        let calendars: Retained<NSArray<EKCalendar>> =
            Self::get_calendars_with_exception_handling(event_store)?
                .into_iter()
                .filter(|c| {
                    let id = unsafe { c.calendarIdentifier() }.to_string();
                    filter.calendar_tracking_id.eq(&id)
                })
                .collect();

        if calendars.is_empty() {
            return Err(Error::CalendarNotFound);
        }

        if filter.from > filter.to {
            return Err(Error::InvalidDateRange);
        }

        let (start_date, end_date) = [filter.from, filter.to]
            .iter()
            .sorted_by(|a, b| a.cmp(b))
            .map(|v| NSDate::initWithTimeIntervalSince1970(NSDate::alloc(), v.timestamp() as f64))
            .collect_tuple()
            .ok_or_else(|| Error::InvalidDateRange)?;

        let event_store = AssertUnwindSafe(event_store);
        let calendars = AssertUnwindSafe(calendars);
        let start_date = AssertUnwindSafe(start_date);
        let end_date = AssertUnwindSafe(end_date);

        let result = objc2::exception::catch(|| unsafe {
            let predicate = event_store.predicateForEventsWithStartDate_endDate_calendars(
                &start_date,
                &end_date,
                Some(&calendars),
            );
            event_store.eventsMatchingPredicate(&predicate)
        });

        result.map_err(|_| Error::XpcConnectionFailed)
    }

    fn get_calendars_with_exception_handling(
        event_store: &EKEventStore,
    ) -> Result<Retained<NSArray<EKCalendar>>, Error> {
        let event_store = AssertUnwindSafe(event_store);
        objc2::exception::catch(|| unsafe { event_store.calendars() })
            .map_err(|_| Error::XpcConnectionFailed)
    }

    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, Error> {
        if !Self::has_calendar_access() {
            return Err(Error::CalendarAccessDenied);
        }

        let fetch = || {
            let event_store = Self::create_event_store();
            let calendars = Self::get_calendars_with_exception_handling(&event_store)?;
            let list = calendars
                .iter()
                .map(|calendar| transform_calendar(&calendar))
                .sorted_by(|a, b| a.title.cmp(&b.title))
                .collect();
            Ok(list)
        };

        fetch
            .retry(retry_backoff())
            .when(|e| matches!(e, Error::XpcConnectionFailed))
            .call()
    }

    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, Error> {
        if !Self::has_calendar_access() {
            return Err(Error::CalendarAccessDenied);
        }

        let fetch = || {
            let event_store = Self::create_event_store();
            let events_array = Self::fetch_events(&event_store, &filter)?;

            let events: Result<Vec<_>, _> = events_array
                .iter()
                .filter_map(|event| {
                    let calendar = unsafe { event.calendar() }?;
                    let calendar_id = unsafe { calendar.calendarIdentifier() };

                    if !filter.calendar_tracking_id.eq(&calendar_id.to_string()) {
                        return None;
                    }

                    Some(transform_event(&event))
                })
                .collect();

            let mut events = events?;
            events.sort_by(|a, b| a.start_date.cmp(&b.start_date));
            Ok(events)
        };

        fetch
            .retry(retry_backoff())
            .when(|e| matches!(e, Error::XpcConnectionFailed))
            .call()
    }
}
