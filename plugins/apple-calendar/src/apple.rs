use std::sync::Arc;

use block2::RcBlock;
use itertools::Itertools;

use objc2::{AllocAnyThread, msg_send, rc::Retained, runtime::Bool};
use objc2_core_graphics::CGColor;
use objc2_event_kit::{
    EKAlarm, EKAuthorizationStatus, EKCalendar, EKCalendarType, EKEntityType, EKEvent,
    EKEventAvailability, EKEventStatus, EKEventStore, EKParticipant, EKParticipantRole,
    EKParticipantStatus, EKParticipantType, EKSourceType, EKStructuredLocation,
};
use objc2_foundation::{
    NSArray, NSDate, NSInteger, NSNotification, NSNotificationCenter, NSObject, NSString,
    NSTimeZone, NSURL,
};

use crate::contact_resolver;
use crate::error::Error;
use crate::model::{
    Alarm, AlarmProximity, AlarmType, AppleCalendar, AppleEvent, CalendarColor, CalendarEntityType,
    CalendarRef, CalendarSource, CalendarSourceType, CalendarType, EventAvailability, EventStatus,
    Participant, ParticipantRole, ParticipantStatus, ParticipantType, StructuredLocation,
};
use crate::recurrence::{offset_date_time_from, parse_recurrence_info};
use crate::types::EventFilter;

struct NotificationObserver {
    #[allow(dead_code)]
    event_store: Retained<EKEventStore>,
    #[allow(dead_code)]
    observer: Retained<NSObject>,
    #[allow(dead_code)]
    block: RcBlock<dyn Fn(*const NSNotification)>,
}

pub fn setup_change_notification<F>(on_change: F)
where
    F: Fn() + Send + Sync + 'static,
{
    std::thread::spawn(move || {
        let event_store = unsafe { EKEventStore::new() };

        let on_change = Arc::new(on_change);
        let block = RcBlock::new(move |_notification: *const NSNotification| {
            on_change();
        });

        let observer = unsafe {
            let center = NSNotificationCenter::defaultCenter();
            let notification_name = NSString::from_str("EKEventStoreChangedNotification");

            let observer: Retained<NSObject> = msg_send![
                &*center,
                addObserverForName: &*notification_name,
                object: &*event_store,
                queue: std::ptr::null::<NSObject>(),
                usingBlock: &*block
            ];

            observer
        };

        let _observer = NotificationObserver {
            event_store,
            observer,
            block,
        };

        loop {
            std::thread::park();
        }
    });
}

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

                if !filter.calendar_tracking_id.eq(&calendar_id.to_string()) {
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

fn transform_calendar(calendar: &EKCalendar) -> AppleCalendar {
    let id = unsafe { calendar.calendarIdentifier() }.to_string();
    let title = unsafe { calendar.title() }.to_string();
    let calendar_type = transform_calendar_type(unsafe { calendar.r#type() });
    let color = unsafe { calendar.CGColor() }.map(|cg_color| extract_color_components(&cg_color));

    let properties = extract_calendar_properties(calendar);

    AppleCalendar {
        id,
        title,
        calendar_type,
        color,
        ..properties
    }
}

fn extract_calendar_properties(calendar: &EKCalendar) -> AppleCalendar {
    let allows_content_modifications = unsafe { calendar.allowsContentModifications() };
    let is_immutable = unsafe { calendar.isImmutable() };
    let is_subscribed = unsafe { calendar.isSubscribed() };
    let supported_event_availabilities = extract_supported_availabilities(calendar);
    let allowed_entity_types = extract_allowed_entity_types(calendar);
    let source = extract_calendar_source(calendar);

    AppleCalendar {
        allows_content_modifications,
        is_immutable,
        is_subscribed,
        supported_event_availabilities,
        allowed_entity_types,
        source,
        id: String::new(),                  // Will be overridden
        title: String::new(),               // Will be overridden
        calendar_type: CalendarType::Local, // Will be overridden
        color: None,                        // Will be overridden
    }
}

fn extract_calendar_source(calendar: &EKCalendar) -> CalendarSource {
    if let Some(src) = unsafe { calendar.source() } {
        let source_identifier = unsafe { src.sourceIdentifier() }.to_string();
        let source_title = unsafe { src.title() }.to_string();
        let source_type = transform_source_type(unsafe { src.sourceType() });
        CalendarSource {
            identifier: source_identifier,
            title: source_title,
            source_type,
        }
    } else {
        CalendarSource::default()
    }
}

fn transform_event(event: &EKEvent) -> Result<AppleEvent, Error> {
    let identifiers = extract_event_identifiers(event);
    let calendar_ref = extract_event_calendar_ref(event);
    let basic_info = extract_event_basic_info(event);
    let dates = extract_event_dates(event);
    let status_info = extract_event_status_info(event);
    let flags = extract_event_flags(event);
    let participants = extract_event_participants(event);
    let location_info = extract_event_location_info(event);
    let recurrence_info = extract_event_recurrence_info(event, flags.has_recurrence_rules);
    let alarm_info = extract_event_alarm_info(event);
    let birthday_info = extract_event_birthday_info(event, &calendar_ref);

    Ok(AppleEvent {
        event_identifier: identifiers.event_identifier,
        calendar_item_identifier: identifiers.calendar_item_identifier,
        external_identifier: identifiers.external_identifier,
        calendar: calendar_ref,
        title: basic_info.title,
        location: basic_info.location,
        url: basic_info.url,
        notes: basic_info.notes,
        creation_date: basic_info.creation_date,
        last_modified_date: basic_info.last_modified_date,
        time_zone: basic_info.time_zone,
        start_date: dates.start_date,
        end_date: dates.end_date,
        is_all_day: dates.is_all_day,
        availability: status_info.availability,
        status: status_info.status,
        has_alarms: flags.has_alarms,
        has_attendees: flags.has_attendees,
        has_notes: flags.has_notes,
        has_recurrence_rules: flags.has_recurrence_rules,
        organizer: participants.organizer,
        attendees: participants.attendees,
        structured_location: location_info.structured_location,
        recurrence: recurrence_info.recurrence,
        occurrence_date: recurrence_info.occurrence_date,
        is_detached: recurrence_info.is_detached,
        alarms: alarm_info.alarms,
        birthday_contact_identifier: birthday_info.birthday_contact_identifier,
        is_birthday: birthday_info.is_birthday,
    })
}

struct EventIdentifiers {
    event_identifier: String,
    calendar_item_identifier: String,
    external_identifier: String,
}

fn extract_event_identifiers(event: &EKEvent) -> EventIdentifiers {
    EventIdentifiers {
        event_identifier: unsafe { event.eventIdentifier() }
            .map(|s| s.to_string())
            .unwrap_or_default(),
        calendar_item_identifier: unsafe { event.calendarItemIdentifier() }.to_string(),
        external_identifier: unsafe { event.calendarItemExternalIdentifier() }
            .map(|s| s.to_string())
            .unwrap_or_default(),
    }
}

fn extract_event_calendar_ref(event: &EKEvent) -> CalendarRef {
    let calendar = unsafe { event.calendar() }.unwrap();
    CalendarRef {
        id: unsafe { calendar.calendarIdentifier() }.to_string(),
        title: unsafe { calendar.title() }.to_string(),
    }
}

struct EventBasicInfo {
    title: String,
    location: Option<String>,
    url: Option<String>,
    notes: Option<String>,
    creation_date: Option<chrono::DateTime<chrono::Utc>>,
    last_modified_date: Option<chrono::DateTime<chrono::Utc>>,
    time_zone: Option<String>,
}

fn extract_event_basic_info(event: &EKEvent) -> EventBasicInfo {
    EventBasicInfo {
        title: unsafe { event.title() }.to_string(),
        location: unsafe { event.location() }.map(|s| s.to_string()),
        url: get_url_string(event, "URL"),
        notes: unsafe { event.notes() }.map(|s| s.to_string()),
        creation_date: unsafe {
            let date: Option<Retained<NSDate>> = msg_send![event, creationDate];
            date.map(offset_date_time_from)
        },
        last_modified_date: unsafe {
            let date: Option<Retained<NSDate>> = msg_send![event, lastModifiedDate];
            date.map(offset_date_time_from)
        },
        time_zone: unsafe {
            let tz: Option<Retained<NSTimeZone>> = msg_send![event, timeZone];
            tz.map(|t| t.name().to_string())
        },
    }
}

struct EventDates {
    start_date: chrono::DateTime<chrono::Utc>,
    end_date: chrono::DateTime<chrono::Utc>,
    is_all_day: bool,
}

fn extract_event_dates(event: &EKEvent) -> EventDates {
    EventDates {
        start_date: offset_date_time_from(unsafe { event.startDate() }),
        end_date: offset_date_time_from(unsafe { event.endDate() }),
        is_all_day: unsafe { event.isAllDay() },
    }
}

struct EventStatusInfo {
    availability: EventAvailability,
    status: EventStatus,
}

fn extract_event_status_info(event: &EKEvent) -> EventStatusInfo {
    EventStatusInfo {
        availability: transform_event_availability(unsafe { event.availability() }),
        status: transform_event_status(unsafe { event.status() }),
    }
}

struct EventFlags {
    has_alarms: bool,
    has_attendees: bool,
    has_notes: bool,
    has_recurrence_rules: bool,
}

fn extract_event_flags(event: &EKEvent) -> EventFlags {
    EventFlags {
        has_alarms: unsafe {
            let b: Bool = msg_send![event, hasAlarms];
            b.as_bool()
        },
        has_attendees: unsafe {
            let b: Bool = msg_send![event, hasAttendees];
            b.as_bool()
        },
        has_notes: unsafe {
            let b: Bool = msg_send![event, hasNotes];
            b.as_bool()
        },
        has_recurrence_rules: unsafe {
            let b: Bool = msg_send![event, hasRecurrenceRules];
            b.as_bool()
        },
    }
}

struct EventParticipants {
    organizer: Option<Participant>,
    attendees: Vec<Participant>,
}

fn extract_event_participants(event: &EKEvent) -> EventParticipants {
    EventParticipants {
        organizer: unsafe { event.organizer() }.map(|p| transform_participant(&p)),
        attendees: unsafe { event.attendees() }
            .map(|arr| arr.iter().map(|p| transform_participant(&p)).collect())
            .unwrap_or_default(),
    }
}

struct EventLocationInfo {
    structured_location: Option<StructuredLocation>,
}

fn extract_event_location_info(event: &EKEvent) -> EventLocationInfo {
    EventLocationInfo {
        structured_location: unsafe {
            let loc: Option<Retained<EKStructuredLocation>> = msg_send![event, structuredLocation];
            loc.map(|l| transform_structured_location(&l))
        },
    }
}

struct EventRecurrenceInfo {
    recurrence: Option<crate::model::RecurrenceInfo>,
    occurrence_date: Option<chrono::DateTime<chrono::Utc>>,
    is_detached: bool,
}

fn extract_event_recurrence_info(
    event: &EKEvent,
    has_recurrence_rules: bool,
) -> EventRecurrenceInfo {
    EventRecurrenceInfo {
        recurrence: parse_recurrence_info(event, has_recurrence_rules),
        occurrence_date: unsafe { event.occurrenceDate() }.map(offset_date_time_from),
        is_detached: unsafe { event.isDetached() },
    }
}

struct EventAlarmInfo {
    alarms: Vec<Alarm>,
}

fn extract_event_alarm_info(event: &EKEvent) -> EventAlarmInfo {
    EventAlarmInfo {
        alarms: unsafe {
            let alarm_arr: Option<Retained<NSArray<EKAlarm>>> = msg_send![event, alarms];
            alarm_arr
                .map(|arr| arr.iter().map(|a| transform_alarm(&a)).collect())
                .unwrap_or_default()
        },
    }
}

struct EventBirthdayInfo {
    birthday_contact_identifier: Option<String>,
    is_birthday: bool,
}

fn extract_event_birthday_info(event: &EKEvent, _calendar_ref: &CalendarRef) -> EventBirthdayInfo {
    let birthday_contact_identifier = unsafe {
        let id: Option<Retained<NSString>> = msg_send![event, birthdayContactIdentifier];
        id.map(|s| s.to_string())
    };

    let is_birthday = birthday_contact_identifier.is_some()
        || unsafe { event.calendar().unwrap().r#type() } == EKCalendarType::Birthday;

    EventBirthdayInfo {
        birthday_contact_identifier,
        is_birthday,
    }
}

fn transform_participant(participant: &EKParticipant) -> Participant {
    let name = unsafe { participant.name() }.map(|s| s.to_string());

    let is_current_user = unsafe { participant.isCurrentUser() };
    let role = transform_participant_role(unsafe { participant.participantRole() });
    let status = transform_participant_status(unsafe { participant.participantStatus() });
    let participant_type = transform_participant_type(unsafe { participant.participantType() });
    let schedule_status = contact_resolver::safe_participant_schedule_status(participant);

    let url = unsafe {
        let url_obj: Option<Retained<NSURL>> = msg_send![participant, URL];
        url_obj.and_then(|u| u.absoluteString().map(|s| s.to_string()))
    };

    let (email, contact) =
        contact_resolver::resolve_participant_contact(participant, url.as_deref());

    Participant {
        name,
        email,
        is_current_user,
        role,
        status,
        participant_type,
        schedule_status,
        url,
        contact,
    }
}

fn transform_alarm(alarm: &EKAlarm) -> Alarm {
    let absolute_date = unsafe {
        let date: Option<Retained<NSDate>> = msg_send![alarm, absoluteDate];
        date.map(offset_date_time_from)
    };

    let relative_offset: Option<f64> = unsafe {
        let offset: f64 = msg_send![alarm, relativeOffset];
        if offset == 0.0 && absolute_date.is_some() {
            None
        } else {
            Some(offset)
        }
    };

    let proximity = unsafe {
        let p: NSInteger = msg_send![alarm, proximity];
        match p {
            0 => Some(AlarmProximity::None),
            1 => Some(AlarmProximity::Enter),
            2 => Some(AlarmProximity::Leave),
            _ => None,
        }
    };

    let alarm_type = unsafe {
        let t: NSInteger = msg_send![alarm, type];
        match t {
            0 => Some(AlarmType::Display),
            1 => Some(AlarmType::Audio),
            2 => Some(AlarmType::Procedure),
            3 => Some(AlarmType::Email),
            _ => None,
        }
    };

    let email_address = unsafe {
        let email: Option<Retained<NSString>> = msg_send![alarm, emailAddress];
        email.map(|s| s.to_string())
    };

    let sound_name = unsafe {
        let sound: Option<Retained<NSString>> = msg_send![alarm, soundName];
        sound.map(|s| s.to_string())
    };

    let url = unsafe {
        let url_obj: Option<Retained<NSURL>> = msg_send![alarm, url];
        url_obj.and_then(|u| u.absoluteString().map(|s| s.to_string()))
    };

    let structured_location = unsafe {
        let loc: Option<Retained<EKStructuredLocation>> = msg_send![alarm, structuredLocation];
        loc.map(|l| transform_structured_location(&l))
    };

    Alarm {
        absolute_date,
        relative_offset,
        proximity,
        alarm_type,
        email_address,
        sound_name,
        url,
        structured_location,
    }
}

fn transform_structured_location(location: &EKStructuredLocation) -> StructuredLocation {
    let title = unsafe { location.title() }
        .map(|s| s.to_string())
        .unwrap_or_default();

    let radius = unsafe {
        let r: f64 = msg_send![location, radius];
        if r == 0.0 { None } else { Some(r) }
    };

    StructuredLocation {
        title,
        geo: None,
        radius,
    }
}

fn transform_calendar_type(t: EKCalendarType) -> CalendarType {
    match t {
        EKCalendarType::Local => CalendarType::Local,
        EKCalendarType::CalDAV => CalendarType::CalDav,
        EKCalendarType::Exchange => CalendarType::Exchange,
        EKCalendarType::Subscription => CalendarType::Subscription,
        EKCalendarType::Birthday => CalendarType::Birthday,
        _ => CalendarType::Local,
    }
}

fn transform_source_type(t: EKSourceType) -> CalendarSourceType {
    match t {
        EKSourceType::Local => CalendarSourceType::Local,
        EKSourceType::Exchange => CalendarSourceType::Exchange,
        EKSourceType::CalDAV => CalendarSourceType::CalDav,
        EKSourceType::MobileMe => CalendarSourceType::MobileMe,
        EKSourceType::Subscribed => CalendarSourceType::Subscribed,
        EKSourceType::Birthdays => CalendarSourceType::Birthdays,
        _ => CalendarSourceType::Local,
    }
}

fn transform_event_availability(a: EKEventAvailability) -> EventAvailability {
    match a {
        EKEventAvailability::NotSupported => EventAvailability::NotSupported,
        EKEventAvailability::Busy => EventAvailability::Busy,
        EKEventAvailability::Free => EventAvailability::Free,
        EKEventAvailability::Tentative => EventAvailability::Tentative,
        EKEventAvailability::Unavailable => EventAvailability::Unavailable,
        _ => EventAvailability::NotSupported,
    }
}

fn transform_event_status(s: EKEventStatus) -> EventStatus {
    match s {
        EKEventStatus::None => EventStatus::None,
        EKEventStatus::Confirmed => EventStatus::Confirmed,
        EKEventStatus::Tentative => EventStatus::Tentative,
        EKEventStatus::Canceled => EventStatus::Canceled,
        _ => EventStatus::None,
    }
}

fn transform_participant_role(r: EKParticipantRole) -> ParticipantRole {
    match r {
        EKParticipantRole::Unknown => ParticipantRole::Unknown,
        EKParticipantRole::Required => ParticipantRole::Required,
        EKParticipantRole::Optional => ParticipantRole::Optional,
        EKParticipantRole::Chair => ParticipantRole::Chair,
        EKParticipantRole::NonParticipant => ParticipantRole::NonParticipant,
        _ => ParticipantRole::Unknown,
    }
}

fn transform_participant_status(s: EKParticipantStatus) -> ParticipantStatus {
    match s {
        EKParticipantStatus::Unknown => ParticipantStatus::Unknown,
        EKParticipantStatus::Pending => ParticipantStatus::Pending,
        EKParticipantStatus::Accepted => ParticipantStatus::Accepted,
        EKParticipantStatus::Declined => ParticipantStatus::Declined,
        EKParticipantStatus::Tentative => ParticipantStatus::Tentative,
        EKParticipantStatus::Delegated => ParticipantStatus::Delegated,
        EKParticipantStatus::Completed => ParticipantStatus::Completed,
        EKParticipantStatus::InProcess => ParticipantStatus::InProgress,
        _ => ParticipantStatus::Unknown,
    }
}

fn transform_participant_type(t: EKParticipantType) -> ParticipantType {
    match t {
        EKParticipantType::Unknown => ParticipantType::Unknown,
        EKParticipantType::Person => ParticipantType::Person,
        EKParticipantType::Room => ParticipantType::Room,
        EKParticipantType::Resource => ParticipantType::Resource,
        EKParticipantType::Group => ParticipantType::Group,
        _ => ParticipantType::Unknown,
    }
}

#[allow(unused_variables)]
fn extract_color_components(cg_color: &CGColor) -> CalendarColor {
    let num_components = CGColor::number_of_components(Some(cg_color));
    let components_ptr = CGColor::components(Some(cg_color));
    let alpha = CGColor::alpha(Some(cg_color)) as f32;

    if components_ptr.is_null() || num_components < 1 {
        return CalendarColor {
            red: 0.5,
            green: 0.5,
            blue: 0.5,
            alpha: 1.0,
        };
    }

    let components = unsafe { std::slice::from_raw_parts(components_ptr, num_components) };

    match num_components {
        2 => {
            let gray = components[0] as f32;
            CalendarColor {
                red: gray,
                green: gray,
                blue: gray,
                alpha,
            }
        }
        3 | 4 => CalendarColor {
            red: components[0] as f32,
            green: components[1] as f32,
            blue: components[2] as f32,
            alpha,
        },
        _ => CalendarColor {
            red: 0.5,
            green: 0.5,
            blue: 0.5,
            alpha: 1.0,
        },
    }
}

fn extract_supported_availabilities(calendar: &EKCalendar) -> Vec<EventAvailability> {
    let mut availabilities = Vec::new();
    unsafe {
        let mask: NSInteger = msg_send![calendar, supportedEventAvailabilities];
        if mask & 1 != 0 {
            availabilities.push(EventAvailability::Busy);
        }
        if mask & 2 != 0 {
            availabilities.push(EventAvailability::Free);
        }
        if mask & 4 != 0 {
            availabilities.push(EventAvailability::Tentative);
        }
        if mask & 8 != 0 {
            availabilities.push(EventAvailability::Unavailable);
        }
    }
    if availabilities.is_empty() {
        availabilities.push(EventAvailability::NotSupported);
    }
    availabilities
}

fn extract_allowed_entity_types(calendar: &EKCalendar) -> Vec<CalendarEntityType> {
    let mut types = Vec::new();
    unsafe {
        let mask: NSInteger = msg_send![calendar, allowedEntityTypes];
        if mask & 1 != 0 {
            types.push(CalendarEntityType::Event);
        }
        if mask & 2 != 0 {
            types.push(CalendarEntityType::Reminder);
        }
    }
    types
}

fn get_url_string<T>(obj: &T, _selector: &str) -> Option<String>
where
    T: objc2::Message + ?Sized,
{
    unsafe {
        let url_obj: Option<Retained<NSURL>> = msg_send![obj, URL];
        url_obj.and_then(|u| u.absoluteString().map(|s| s.to_string()))
    }
}
