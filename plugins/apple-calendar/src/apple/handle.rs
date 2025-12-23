use itertools::Itertools;
use objc2::{AllocAnyThread, rc::Retained};
use objc2_event_kit::{EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore};
use objc2_foundation::{NSArray, NSDate};

use crate::error::Error;
use crate::types::EventFilter;
use crate::types::{AppleCalendar, AppleEvent};

use super::transforms::{transform_calendar, transform_event};

pub struct Handle {
    event_store: Retained<EKEventStore>,
}

impl Default for Handle {
    fn default() -> Self {
        let event_store = unsafe { EKEventStore::new() };
        Self { event_store }
    }
}

impl Handle {
    fn has_calendar_access(&self) -> bool {
        let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
        matches!(status, EKAuthorizationStatus::FullAccess)
    }

    fn fetch_events(&self, filter: &EventFilter) -> Result<Retained<NSArray<EKEvent>>, Error> {
        let calendars: Retained<NSArray<EKCalendar>> = unsafe { self.event_store.calendars() }
            .into_iter()
            .filter(|c| {
                let id = unsafe { c.calendarIdentifier() }.to_string();
                filter.calendar_identifier.eq(&id)
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

        let predicate = unsafe {
            self.event_store
                .predicateForEventsWithStartDate_endDate_calendars(
                    &start_date,
                    &end_date,
                    Some(&calendars),
                )
        };

        Ok(unsafe { self.event_store.eventsMatchingPredicate(&predicate) })
    }

    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, Error> {
        if !self.has_calendar_access() {
            return Err(Error::CalendarAccessDenied);
        }

        let calendars = unsafe { self.event_store.calendars() };

        let list = calendars
            .iter()
            .map(|calendar| transform_calendar(&calendar))
            .sorted_by(|a, b| a.title.cmp(&b.title))
            .collect();

        Ok(list)
    }

    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, Error> {
        if !self.has_calendar_access() {
            return Err(Error::CalendarAccessDenied);
        }

        let events_array = self.fetch_events(&filter)?;

        let events: Result<Vec<_>, _> = events_array
            .iter()
            .filter_map(|event| {
                let calendar = unsafe { event.calendar() }?;
                let calendar_id = unsafe { calendar.calendarIdentifier() };

                if !filter.calendar_identifier.eq(&calendar_id.to_string()) {
                    return None;
                }

                Some(transform_event(&event))
            })
            .collect();

        let mut events = events?;
        events.sort_by(|a, b| a.start_date.cmp(&b.start_date));

        Ok(events)
    }
}
