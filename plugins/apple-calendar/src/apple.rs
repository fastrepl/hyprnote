use itertools::Itertools;

use objc2::{msg_send, rc::Retained, AllocAnyThread};
use objc2_event_kit::{
    EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore, EKParticipant,
};
use objc2_foundation::{NSArray, NSDate, NSString};

use crate::recurrence::{offset_date_time_from, parse_recurrence_info};
use crate::types::{Calendar, Event, EventFilter, Participant, Platform};

pub struct Handle {
    event_store: Retained<EKEventStore>,
}

#[allow(clippy::new_without_default)]
impl Handle {
    pub fn new() -> Self {
        let event_store = unsafe { EKEventStore::new() };
        Self { event_store }
    }

    fn has_calendar_access(&self) -> bool {
        let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
        matches!(status, EKAuthorizationStatus::FullAccess)
    }

    fn fetch_events(&self, filter: &EventFilter) -> Retained<NSArray<EKEvent>> {
        let calendars: Retained<NSArray<EKCalendar>> = unsafe { self.event_store.calendars() }
            .into_iter()
            .filter(|c| {
                let id = unsafe { c.calendarIdentifier() }.to_string();
                filter.calendar_tracking_id.eq(&id)
            })
            .collect();

        if calendars.is_empty() {
            let empty_array: Retained<NSArray<EKEvent>> = NSArray::new();
            return empty_array;
        }

        let (start_date, end_date) = [filter.from, filter.to]
            .iter()
            .sorted_by(|a, b| a.cmp(b))
            .map(|v| NSDate::initWithTimeIntervalSince1970(NSDate::alloc(), v.timestamp() as f64))
            .collect_tuple()
            .unwrap();

        let predicate = unsafe {
            self.event_store
                .predicateForEventsWithStartDate_endDate_calendars(
                    &start_date,
                    &end_date,
                    Some(&calendars),
                )
        };

        unsafe { self.event_store.eventsMatchingPredicate(&predicate) }
    }

    fn transform_participant(&self, participant: &EKParticipant) -> Participant {
        let name = unsafe { participant.name() }
            .unwrap_or_default()
            .to_string();

        let email = unsafe {
            let email_ns: *const NSString = msg_send![participant, emailAddress];
            email_ns.as_ref().map(|s| s.to_string())
        };

        Participant { name, email }
    }

    pub fn list_calendars(&self) -> Result<Vec<Calendar>, anyhow::Error> {
        if !self.has_calendar_access() {
            return Err(anyhow::anyhow!("calendar_access_denied"));
        }

        let calendars = unsafe { self.event_store.calendars() };

        let list = calendars
            .iter()
            .map(|calendar| {
                let id = unsafe { calendar.calendarIdentifier() };
                let title = unsafe { calendar.title() };

                let source = unsafe { calendar.source() }.unwrap();
                let source_title = unsafe { source.title() };

                Calendar {
                    id: id.to_string(),
                    platform: Platform::Apple,
                    name: title.to_string(),
                    source: Some(source_title.to_string()),
                }
            })
            .sorted_by(|a, b| a.name.cmp(&b.name))
            .collect();

        Ok(list)
    }

    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, anyhow::Error> {
        if !self.has_calendar_access() {
            return Err(anyhow::anyhow!("calendar_access_denied"));
        }

        let events = self
            .fetch_events(&filter)
            .iter()
            .filter_map(|event| {
                let id = unsafe { event.eventIdentifier() }.unwrap();
                let title = unsafe { event.title() };
                let note = unsafe { event.notes().unwrap_or_default() };
                let start_date = unsafe { event.startDate() };
                let end_date = unsafe { event.endDate() };

                let calendar = unsafe { event.calendar() }.unwrap();
                let calendar_id = unsafe { calendar.calendarIdentifier() };

                if !filter.calendar_tracking_id.eq(&calendar_id.to_string()) {
                    return None;
                }

                let recurrence = parse_recurrence_info(&event, &start_date);

                let participants = unsafe { event.attendees().unwrap_or_default() };
                let participant_list: Vec<Participant> = participants
                    .iter()
                    .filter(|p| {
                        let is_current_user = unsafe { p.isCurrentUser() };
                        !is_current_user
                    })
                    .map(|p| self.transform_participant(&p))
                    .collect();

                Some(Event {
                    id: id.to_string(),
                    calendar_id: calendar_id.to_string(),
                    platform: Platform::Apple,
                    name: title.to_string(),
                    note: note.to_string(),
                    participants: participant_list,
                    start_date: offset_date_time_from(start_date),
                    end_date: offset_date_time_from(end_date),
                    google_event_url: None,
                    recurrence,
                })
            })
            .sorted_by(|a, b| a.start_date.cmp(&b.start_date))
            .collect();

        Ok(events)
    }
}
