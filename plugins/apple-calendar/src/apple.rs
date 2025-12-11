use itertools::Itertools;

use objc2::{msg_send, rc::Retained, runtime::Bool, AllocAnyThread};
use objc2_event_kit::{
    EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore, EKParticipant,
    EKRecurrenceEnd, EKRecurrenceFrequency, EKRecurrenceRule,
};
use objc2_foundation::{NSArray, NSDate, NSInteger, NSString};

use crate::types::{
    Calendar, Event, EventFilter, Participant, Platform, RecurrenceEnd, RecurrenceFrequency,
    RecurrenceInfo, RecurrenceRule,
};

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

fn series_id(event: &EKEvent) -> String {
    unsafe {
        event
            .calendarItemExternalIdentifier()
            .map(|s| s.to_string())
            .unwrap_or_else(|| event.calendarItemIdentifier().to_string())
    }
}

fn parse_recurrence_info(event: &EKEvent, start_date: &Retained<NSDate>) -> Option<RecurrenceInfo> {
    unsafe {
        let has_rules: Bool = msg_send![event, hasRecurrenceRules];
        let occurrence_date = event.occurrenceDate();

        if !has_rules.as_bool() && occurrence_date.is_none() {
            return None;
        }

        let occ_date = occurrence_date
            .map(|d| offset_date_time_from(d))
            .unwrap_or_else(|| offset_date_time_from(start_date.clone()));

        Some(RecurrenceInfo {
            series_id: series_id(event),
            occurrence_date: occ_date,
            is_detached: event.isDetached(),
            rule: parse_recurrence_rule(event),
        })
    }
}

fn parse_recurrence_rule(event: &EKEvent) -> Option<RecurrenceRule> {
    unsafe {
        let rules: Option<Retained<NSArray<EKRecurrenceRule>>> = msg_send![event, recurrenceRules];
        let rules = rules?;
        if rules.is_empty() {
            return None;
        }

        let rule = rules.objectAtIndex(0);

        let frequency = match rule.frequency() {
            EKRecurrenceFrequency::Daily => RecurrenceFrequency::Daily,
            EKRecurrenceFrequency::Weekly => RecurrenceFrequency::Weekly,
            EKRecurrenceFrequency::Monthly => RecurrenceFrequency::Monthly,
            EKRecurrenceFrequency::Yearly => RecurrenceFrequency::Yearly,
            _ => return None,
        };

        let interval = rule.interval() as u32;
        let end = parse_recurrence_end(&rule);

        Some(RecurrenceRule {
            frequency,
            interval,
            end,
        })
    }
}

fn parse_recurrence_end(rule: &EKRecurrenceRule) -> Option<RecurrenceEnd> {
    unsafe {
        let end: Option<Retained<EKRecurrenceEnd>> = msg_send![rule, recurrenceEnd];
        let end = end?;

        let end_date: Option<Retained<NSDate>> = msg_send![&*end, endDate];
        if let Some(date) = end_date {
            return Some(RecurrenceEnd::Date(offset_date_time_from(date)));
        }

        let occurrence_count: NSInteger = msg_send![&*end, occurrenceCount];
        if occurrence_count > 0 {
            return Some(RecurrenceEnd::Count(occurrence_count as u32));
        }

        None
    }
}

fn offset_date_time_from(date: Retained<NSDate>) -> chrono::DateTime<chrono::Utc> {
    let seconds = date.timeIntervalSinceReferenceDate();

    let cocoa_reference: chrono::DateTime<chrono::Utc> =
        chrono::DateTime::from_naive_utc_and_offset(
            chrono::NaiveDateTime::new(
                chrono::NaiveDate::from_ymd_opt(2001, 1, 1).unwrap(),
                chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            ),
            chrono::Utc,
        );

    let unix_timestamp = seconds + cocoa_reference.timestamp() as f64;
    chrono::DateTime::<chrono::Utc>::from_timestamp(unix_timestamp as i64, 0).unwrap()
}
