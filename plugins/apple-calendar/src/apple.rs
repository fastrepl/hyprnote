use itertools::Itertools;

use objc2::{msg_send, rc::Retained, runtime::Bool, AllocAnyThread};
use objc2_event_kit::{
    EKAlarm, EKAuthorizationStatus, EKCalendar, EKCalendarType, EKEntityType, EKEvent,
    EKEventAvailability, EKEventStatus, EKEventStore, EKParticipant, EKParticipantRole,
    EKParticipantScheduleStatus, EKParticipantStatus, EKParticipantType, EKRecurrenceDayOfWeek,
    EKRecurrenceEnd, EKRecurrenceFrequency, EKRecurrenceRule, EKSourceType, EKStructuredLocation,
};
use objc2_foundation::{NSArray, NSDate, NSInteger, NSNumber, NSString, NSTimeZone};

use crate::model::{
    Alarm, AlarmProximity, AlarmType, AppleCalendar, AppleEvent, CalendarColor, CalendarEntityType,
    CalendarRef, CalendarSource, CalendarSourceType, CalendarType, EventAvailability, EventStatus,
    GeoLocation, Participant, ParticipantRole, ParticipantScheduleStatus, ParticipantStatus,
    ParticipantType, RecurrenceDayOfWeek, RecurrenceEnd, RecurrenceFrequency, RecurrenceInfo,
    RecurrenceOccurrence, RecurrenceRule, StructuredLocation, Weekday,
};
use crate::types::EventFilter;

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

    pub fn list_calendars(&self) -> Result<Vec<AppleCalendar>, anyhow::Error> {
        if !self.has_calendar_access() {
            return Err(anyhow::anyhow!("calendar_access_denied"));
        }

        let calendars = unsafe { self.event_store.calendars() };

        let list = calendars
            .iter()
            .map(|calendar| transform_calendar(&calendar))
            .sorted_by(|a, b| a.title.cmp(&b.title))
            .collect();

        Ok(list)
    }

    pub fn list_events(&self, filter: EventFilter) -> Result<Vec<AppleEvent>, anyhow::Error> {
        if !self.has_calendar_access() {
            return Err(anyhow::anyhow!("calendar_access_denied"));
        }

        let events = self
            .fetch_events(&filter)
            .iter()
            .filter_map(|event| {
                let calendar = unsafe { event.calendar() }?;
                let calendar_id = unsafe { calendar.calendarIdentifier() };

                if !filter.calendar_tracking_id.eq(&calendar_id.to_string()) {
                    return None;
                }

                Some(transform_event(&event))
            })
            .sorted_by(|a, b| a.start_date.cmp(&b.start_date))
            .collect();

        Ok(events)
    }
}

fn transform_calendar(calendar: &EKCalendar) -> AppleCalendar {
    let id = unsafe { calendar.calendarIdentifier() }.to_string();
    let title = unsafe { calendar.title() }.to_string();
    let calendar_type = transform_calendar_type(unsafe { calendar.r#type() });

    let color = unsafe {
        let cg_color: *const std::ffi::c_void = msg_send![calendar, CGColor];
        if cg_color.is_null() {
            None
        } else {
            extract_color_components(cg_color)
        }
    };

    let allows_content_modifications = unsafe { calendar.allowsContentModifications() };
    let is_immutable = unsafe { calendar.isImmutable() };
    let is_subscribed = unsafe { calendar.isSubscribed() };

    let supported_event_availabilities = extract_supported_availabilities(calendar);
    let allowed_entity_types = extract_allowed_entity_types(calendar);

    let source = if let Some(src) = unsafe { calendar.source() } {
        let source_identifier = unsafe { src.sourceIdentifier() }.to_string();
        let source_title = unsafe { src.title() }.to_string();
        let source_type = transform_source_type(unsafe { src.sourceType() });
        CalendarSource {
            identifier: source_identifier,
            title: source_title,
            source_type,
        }
    } else {
        CalendarSource {
            identifier: String::new(),
            title: String::new(),
            source_type: CalendarSourceType::Local,
        }
    };

    AppleCalendar {
        id,
        title,
        calendar_type,
        color,
        allows_content_modifications,
        is_immutable,
        is_subscribed,
        supported_event_availabilities,
        allowed_entity_types,
        source,
    }
}

fn transform_event(event: &EKEvent) -> AppleEvent {
    let event_identifier = unsafe { event.eventIdentifier() }
        .map(|s| s.to_string())
        .unwrap_or_default();
    let calendar_item_identifier = unsafe { event.calendarItemIdentifier() }.to_string();
    let external_identifier = unsafe { event.calendarItemExternalIdentifier() }
        .map(|s| s.to_string())
        .unwrap_or_default();

    let calendar = unsafe { event.calendar() }.unwrap();
    let calendar_ref = CalendarRef {
        id: unsafe { calendar.calendarIdentifier() }.to_string(),
        title: unsafe { calendar.title() }.to_string(),
    };

    let title = unsafe { event.title() }.to_string();
    let location = unsafe { event.location() }.map(|s| s.to_string());
    let url = unsafe {
        let url_obj: Option<Retained<objc2_foundation::NSURL>> = msg_send![event, URL];
        url_obj.and_then(|u| u.absoluteString().map(|s| s.to_string()))
    };
    let notes = unsafe { event.notes() }.map(|s| s.to_string());

    let creation_date = unsafe {
        let date: Option<Retained<NSDate>> = msg_send![event, creationDate];
        date.map(offset_date_time_from)
    };
    let last_modified_date = unsafe {
        let date: Option<Retained<NSDate>> = msg_send![event, lastModifiedDate];
        date.map(offset_date_time_from)
    };

    let time_zone = unsafe {
        let tz: Option<Retained<NSTimeZone>> = msg_send![event, timeZone];
        tz.map(|t| t.name().to_string())
    };

    let start_date = unsafe { event.startDate() };
    let end_date = unsafe { event.endDate() };
    let is_all_day = unsafe { event.isAllDay() };

    let availability = transform_event_availability(unsafe { event.availability() });
    let status = transform_event_status(unsafe { event.status() });

    let has_alarms: bool = unsafe {
        let b: Bool = msg_send![event, hasAlarms];
        b.as_bool()
    };
    let has_attendees: bool = unsafe {
        let b: Bool = msg_send![event, hasAttendees];
        b.as_bool()
    };
    let has_notes: bool = unsafe {
        let b: Bool = msg_send![event, hasNotes];
        b.as_bool()
    };
    let has_recurrence_rules: bool = unsafe {
        let b: Bool = msg_send![event, hasRecurrenceRules];
        b.as_bool()
    };

    let organizer = unsafe { event.organizer() }.map(|p| transform_participant(&p));
    let attendees = unsafe { event.attendees() }
        .map(|arr| arr.iter().map(|p| transform_participant(&p)).collect())
        .unwrap_or_default();

    let structured_location = unsafe {
        let loc: Option<Retained<EKStructuredLocation>> = msg_send![event, structuredLocation];
        loc.map(|l| transform_structured_location(&l))
    };

    let recurrence = parse_recurrence_info(event, has_recurrence_rules);

    let occurrence_date = unsafe { event.occurrenceDate() }.map(offset_date_time_from);
    let is_detached = unsafe { event.isDetached() };

    let alarms = unsafe {
        let alarm_arr: Option<Retained<NSArray<EKAlarm>>> = msg_send![event, alarms];
        alarm_arr
            .map(|arr| arr.iter().map(|a| transform_alarm(&a)).collect())
            .unwrap_or_default()
    };

    let birthday_contact_identifier = unsafe {
        let id: Option<Retained<NSString>> = msg_send![event, birthdayContactIdentifier];
        id.map(|s| s.to_string())
    };
    let is_birthday = birthday_contact_identifier.is_some()
        || unsafe { calendar.r#type() } == EKCalendarType::Birthday;

    AppleEvent {
        event_identifier,
        calendar_item_identifier,
        external_identifier,
        calendar: calendar_ref,
        title,
        location,
        url,
        notes,
        creation_date,
        last_modified_date,
        time_zone,
        start_date: offset_date_time_from(start_date),
        end_date: offset_date_time_from(end_date),
        is_all_day,
        availability,
        status,
        has_alarms,
        has_attendees,
        has_notes,
        has_recurrence_rules,
        organizer,
        attendees,
        structured_location,
        recurrence,
        occurrence_date,
        is_detached,
        alarms,
        birthday_contact_identifier,
        is_birthday,
    }
}

fn transform_participant(participant: &EKParticipant) -> Participant {
    let name = unsafe { participant.name() }.map(|s| s.to_string());

    let email = unsafe {
        let email_ns: *const NSString = msg_send![participant, emailAddress];
        email_ns.as_ref().map(|s| s.to_string())
    };

    let is_current_user = unsafe { participant.isCurrentUser() };
    let role = transform_participant_role(unsafe { participant.participantRole() });
    let status = transform_participant_status(unsafe { participant.participantStatus() });
    let participant_type = transform_participant_type(unsafe { participant.participantType() });

    let url = unsafe {
        let url_obj: Option<Retained<objc2_foundation::NSURL>> = msg_send![participant, URL];
        url_obj.and_then(|u| u.absoluteString().map(|s| s.to_string()))
    };

    Participant {
        name,
        email,
        is_current_user,
        role,
        status,
        participant_type,
        schedule_status: None,
        url,
        contact: None,
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
        let url_obj: Option<Retained<objc2_foundation::NSURL>> = msg_send![alarm, url];
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
        if r == 0.0 {
            None
        } else {
            Some(r)
        }
    };

    StructuredLocation {
        title,
        geo: None,
        radius,
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

fn parse_recurrence_info(event: &EKEvent, has_recurrence_rules: bool) -> Option<RecurrenceInfo> {
    let occurrence_date = unsafe { event.occurrenceDate() };

    if !has_recurrence_rules && occurrence_date.is_none() {
        return None;
    }

    let occurrence = occurrence_date.map(|date| RecurrenceOccurrence {
        original_start: offset_date_time_from(date),
        is_detached: unsafe { event.isDetached() },
    });

    let rules = parse_recurrence_rules(event);

    Some(RecurrenceInfo {
        series_identifier: series_id(event),
        has_recurrence_rules,
        occurrence,
        rules,
    })
}

fn parse_recurrence_rules(event: &EKEvent) -> Vec<RecurrenceRule> {
    unsafe {
        let rules: Option<Retained<NSArray<EKRecurrenceRule>>> = msg_send![event, recurrenceRules];
        rules
            .map(|arr| arr.iter().filter_map(|r| parse_single_rule(&r)).collect())
            .unwrap_or_default()
    }
}

fn parse_single_rule(rule: &EKRecurrenceRule) -> Option<RecurrenceRule> {
    let frequency = match rule.frequency() {
        EKRecurrenceFrequency::Daily => RecurrenceFrequency::Daily,
        EKRecurrenceFrequency::Weekly => RecurrenceFrequency::Weekly,
        EKRecurrenceFrequency::Monthly => RecurrenceFrequency::Monthly,
        EKRecurrenceFrequency::Yearly => RecurrenceFrequency::Yearly,
        _ => return None,
    };

    let interval = rule.interval() as u32;

    let days_of_week = unsafe {
        let dow: Option<Retained<NSArray<EKRecurrenceDayOfWeek>>> = msg_send![rule, daysOfTheWeek];
        dow.map(|arr| {
            arr.iter()
                .map(|d| {
                    let weekday = transform_weekday(d.dayOfTheWeek());
                    let week_number = {
                        let wn = d.weekNumber();
                        if wn == 0 {
                            None
                        } else {
                            Some(wn as i8)
                        }
                    };
                    RecurrenceDayOfWeek {
                        weekday,
                        week_number,
                    }
                })
                .collect()
        })
        .unwrap_or_default()
    };

    let days_of_month = unsafe {
        let dom: Option<Retained<NSArray<NSNumber>>> = msg_send![rule, daysOfTheMonth];
        dom.map(|arr| arr.iter().map(|n| n.intValue() as i8).collect())
            .unwrap_or_default()
    };

    let months_of_year = unsafe {
        let moy: Option<Retained<NSArray<NSNumber>>> = msg_send![rule, monthsOfTheYear];
        moy.map(|arr| arr.iter().map(|n| n.intValue() as u8).collect())
            .unwrap_or_default()
    };

    let weeks_of_year = unsafe {
        let woy: Option<Retained<NSArray<NSNumber>>> = msg_send![rule, weeksOfTheYear];
        woy.map(|arr| arr.iter().map(|n| n.intValue() as i8).collect())
            .unwrap_or_default()
    };

    let days_of_year = unsafe {
        let doy: Option<Retained<NSArray<NSNumber>>> = msg_send![rule, daysOfTheYear];
        doy.map(|arr| arr.iter().map(|n| n.intValue() as i16).collect())
            .unwrap_or_default()
    };

    let set_positions = unsafe {
        let sp: Option<Retained<NSArray<NSNumber>>> = msg_send![rule, setPositions];
        sp.map(|arr| arr.iter().map(|n| n.intValue() as i16).collect())
            .unwrap_or_default()
    };

    let first_day_of_week = unsafe {
        let fdow: NSInteger = msg_send![rule, firstDayOfTheWeek];
        if fdow == 0 {
            None
        } else {
            Some(transform_weekday_from_int(fdow))
        }
    };

    let end = parse_recurrence_end(rule);

    Some(RecurrenceRule {
        frequency,
        interval,
        days_of_week,
        days_of_month,
        months_of_year,
        weeks_of_year,
        days_of_year,
        set_positions,
        first_day_of_week,
        end,
    })
}

fn parse_recurrence_end(rule: &EKRecurrenceRule) -> Option<RecurrenceEnd> {
    unsafe {
        let end: Option<Retained<EKRecurrenceEnd>> = msg_send![rule, recurrenceEnd];
        let end = end?;

        let end_date: Option<Retained<NSDate>> = msg_send![&*end, endDate];
        if let Some(date) = end_date {
            return Some(RecurrenceEnd::Until(offset_date_time_from(date)));
        }

        let occurrence_count: NSInteger = msg_send![&*end, occurrenceCount];
        if occurrence_count > 0 {
            return Some(RecurrenceEnd::Count(occurrence_count as u32));
        }

        None
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

fn transform_weekday(w: objc2_event_kit::EKWeekday) -> Weekday {
    match w {
        objc2_event_kit::EKWeekday::Sunday => Weekday::Sunday,
        objc2_event_kit::EKWeekday::Monday => Weekday::Monday,
        objc2_event_kit::EKWeekday::Tuesday => Weekday::Tuesday,
        objc2_event_kit::EKWeekday::Wednesday => Weekday::Wednesday,
        objc2_event_kit::EKWeekday::Thursday => Weekday::Thursday,
        objc2_event_kit::EKWeekday::Friday => Weekday::Friday,
        objc2_event_kit::EKWeekday::Saturday => Weekday::Saturday,
        _ => Weekday::Sunday,
    }
}

fn transform_weekday_from_int(w: NSInteger) -> Weekday {
    match w {
        1 => Weekday::Sunday,
        2 => Weekday::Monday,
        3 => Weekday::Tuesday,
        4 => Weekday::Wednesday,
        5 => Weekday::Thursday,
        6 => Weekday::Friday,
        7 => Weekday::Saturday,
        _ => Weekday::Sunday,
    }
}

#[allow(unused_variables)]
fn extract_color_components(cg_color: *const std::ffi::c_void) -> Option<CalendarColor> {
    None
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
