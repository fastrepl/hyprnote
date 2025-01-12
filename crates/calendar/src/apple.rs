use anyhow::Result;
use itertools::Itertools;

use block2::RcBlock;
use objc2::{
    rc::Retained,
    runtime::{Bool, ProtocolObject},
    ClassType,
};
use objc2_contacts::{CNAuthorizationStatus, CNContactStore, CNEntityType, CNKeyDescriptor};
use objc2_event_kit::{EKAuthorizationStatus, EKCalendar, EKEntityType, EKEventStore};
use objc2_foundation::{NSArray, NSDate, NSError, NSPredicate, NSString};

use crate::{Calendar, CalendarSource, Event, EventFilter, Participant, Platform};

pub struct Handle {
    event_store: Retained<EKEventStore>,
    contacts_store: Retained<CNContactStore>,
    calendar_access_granted: bool,
    contacts_access_granted: bool,
}

impl Handle {
    pub fn new() -> Self {
        let event_store = unsafe { EKEventStore::new() };
        let contacts_store = unsafe { CNContactStore::new() };

        let mut handle = Self {
            event_store,
            contacts_store,
            calendar_access_granted: false,
            contacts_access_granted: false,
        };

        handle.calendar_access_granted = handle.calendar_access_status();
        handle.contacts_access_granted = handle.contacts_access_status();

        handle
    }

    pub fn request_calendar_access(&mut self) {
        if self.calendar_access_granted {
            return;
        }

        let (tx, rx) = std::sync::mpsc::channel::<bool>();
        let completion = RcBlock::new(move |granted: Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });

        unsafe {
            self.event_store
                .requestFullAccessToEventsWithCompletion(&*completion as *const _ as *mut _)
        };

        if let Ok(true) = rx.recv() {
            self.calendar_access_granted = true;
        } else {
            self.calendar_access_granted = false;
        }
    }

    pub fn request_contacts_access(&mut self) {
        if self.contacts_access_granted {
            return;
        }

        let (tx, rx) = std::sync::mpsc::channel::<bool>();
        let completion = RcBlock::new(move |granted: Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });

        unsafe {
            self.contacts_store
                .requestAccessForEntityType_completionHandler(CNEntityType::Contacts, &completion);
        };

        if let Ok(true) = rx.recv() {
            self.calendar_access_granted = true;
        } else {
            self.calendar_access_granted = false;
        }
    }

    pub fn calendar_access_status(&self) -> bool {
        let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
        match status {
            EKAuthorizationStatus::FullAccess => true,
            _ => false,
        }
    }

    pub fn contacts_access_status(&self) -> bool {
        let status =
            unsafe { CNContactStore::authorizationStatusForEntityType(CNEntityType::Contacts) };
        match status {
            CNAuthorizationStatus::Authorized => true,
            _ => false,
        }
    }

    fn events_predicate(&self, filter: &EventFilter) -> Retained<NSPredicate> {
        let start_date = unsafe {
            NSDate::initWithTimeIntervalSince1970(
                NSDate::alloc(),
                filter.from.unix_timestamp() as f64,
            )
        };
        let end_date = unsafe {
            NSDate::initWithTimeIntervalSince1970(
                NSDate::alloc(),
                filter.to.unix_timestamp() as f64,
            )
        };

        let calendars = unsafe { self.event_store.calendars() };
        let calendars: Retained<NSArray<EKCalendar>> = calendars
            .into_iter()
            .filter(|c| {
                let id = unsafe { c.calendarIdentifier() }.to_string();
                filter.calendars.iter().any(|c| c.id.eq(&id))
            })
            .collect();

        let predicate = unsafe {
            self.event_store
                .predicateForEventsWithStartDate_endDate_calendars(
                    &start_date,
                    &end_date,
                    Some(&calendars),
                )
        };

        predicate
    }
}

impl CalendarSource for Handle {
    async fn list_calendars(&self) -> Result<Vec<Calendar>> {
        let calendars = unsafe { self.event_store.calendars() };

        let list = calendars
            .iter()
            .map(|calendar| {
                // https://docs.rs/objc2-event-kit/latest/objc2_event_kit/struct.EKCalendar.html
                // https://developer.apple.com/documentation/eventkit/ekcalendar
                // https://developer.apple.com/documentation/eventkit/ekevent/eventidentifier
                // If the calendar of an event changes, its identifier most likely changes as well.
                let id = unsafe { calendar.calendarIdentifier() };
                let title = unsafe { calendar.title() };

                Calendar {
                    id: id.to_string(),
                    platform: Platform::Apple,
                    name: title.to_string(),
                }
            })
            .sorted_by(|a, b| a.name.cmp(&b.name))
            .collect();

        Ok(list)
    }

    async fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>> {
        let predicate = self.events_predicate(&filter);
        let events = unsafe { self.event_store.eventsMatchingPredicate(&predicate) };

        let list = events
            .iter()
            .filter_map(|event| {
                // https://docs.rs/objc2-event-kit/latest/objc2_event_kit/struct.EKEvent.html
                // https://developer.apple.com/documentation/eventkit/ekevent
                let id = unsafe { event.eventIdentifier() }.unwrap();
                let title = unsafe { event.title() };
                let note = unsafe { event.notes().unwrap_or_default() };
                let start_date = unsafe { event.startDate() };
                let end_date = unsafe { event.endDate() };

                let calendar = unsafe { event.calendar() }.unwrap();
                let calendar_id = unsafe { calendar.calendarIdentifier() };

                // This is theoretically not needed, but it seems like the 'calendars' filter does not work in the predicate.
                if !filter
                    .calendars
                    .iter()
                    .any(|c| c.id.eq(&calendar_id.to_string()))
                {
                    return None;
                }

                let participants = unsafe { event.attendees().unwrap_or_default() }
                    .iter()
                    .map(|p| {
                        let name = unsafe { p.name() }.unwrap_or_default().to_string();
                        let contact_pred = unsafe { p.contactPredicate() };

                        let email_string = NSString::from_str("emailAddresses");
                        let cnkey_email: Retained<ProtocolObject<dyn CNKeyDescriptor>> =
                            ProtocolObject::from_retained(email_string);
                        let keys = NSArray::from_vec(vec![cnkey_email]);

                        let contact = unsafe {
                            self.contacts_store
                                .unifiedContactsMatchingPredicate_keysToFetch_error(
                                    &contact_pred,
                                    &keys,
                                )
                        }
                        .unwrap_or_default();

                        let email: String = match contact.first() {
                            Some(contact) => {
                                unsafe { contact.emailAddresses().first().unwrap().value() }
                                    .to_string()
                            }
                            None => "".to_string(),
                        };

                        Participant { name, email }
                    })
                    .collect();

                Some(Event {
                    id: id.to_string(),
                    calendar_id: calendar_id.to_string(),
                    platform: Platform::Apple,
                    name: title.to_string(),
                    note: note.to_string(),
                    participants,
                    start_date: offset_date_time_from(start_date),
                    end_date: offset_date_time_from(end_date),
                    google_event_url: None,
                })
            })
            .sorted_by(|a, b| a.start_date.cmp(&b.start_date))
            .collect();

        Ok(list)
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

    #[tokio::test]
    async fn test_time() {
        let now = unsafe { NSDate::new() };
        let now_from_nsdate = offset_date_time_from(now.to_owned());
        let now_from_time = time::OffsetDateTime::now_utc();
        let diff = (now_from_nsdate - now_from_time).abs();
        assert!(diff.whole_seconds() < 1);
    }

    #[tokio::test]
    async fn test_request_access() {
        let mut handle = Handle::new();
        handle.request_calendar_access();
        handle.request_contacts_access();
    }

    #[tokio::test]
    async fn test_list_calendars() {
        let handle = Handle::new();
        let calendars = handle.list_calendars().await.unwrap();
        assert!(!calendars.is_empty());
    }

    #[tokio::test]
    async fn test_list_events() {
        let handle = Handle::new();
        let filter = EventFilter {
            calendars: vec![],
            from: time::OffsetDateTime::now_utc() - time::Duration::days(100),
            to: time::OffsetDateTime::now_utc() + time::Duration::days(100),
        };

        let events = handle.list_events(filter).await.unwrap();
        assert!(events.is_empty());
    }
}
