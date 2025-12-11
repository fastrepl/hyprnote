use objc2::{msg_send, rc::Retained, runtime::Bool};
use objc2_event_kit::{EKEvent, EKRecurrenceEnd, EKRecurrenceFrequency, EKRecurrenceRule};
use objc2_foundation::{NSArray, NSDate, NSInteger};

use crate::types::{RecurrenceEnd, RecurrenceFrequency, RecurrenceInfo, RecurrenceRule};

pub fn series_id(event: &EKEvent) -> String {
    unsafe {
        event
            .calendarItemExternalIdentifier()
            .map(|s| s.to_string())
            .unwrap_or_else(|| event.calendarItemIdentifier().to_string())
    }
}

pub fn parse_recurrence_info(
    event: &EKEvent,
    start_date: &Retained<NSDate>,
) -> Option<RecurrenceInfo> {
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

pub fn offset_date_time_from(date: Retained<NSDate>) -> chrono::DateTime<chrono::Utc> {
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
