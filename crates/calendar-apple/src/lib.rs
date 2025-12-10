use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::future::Future;

pub use anyhow::Error;

pub trait CalendarSource {
    fn list_calendars(&self) -> impl Future<Output = Result<Vec<Calendar>, Error>>;
    fn list_events(&self, filter: EventFilter) -> impl Future<Output = Result<Vec<Event>, Error>>;
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Platform {
    Apple,
    Google,
    Outlook,
}

impl std::fmt::Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Platform::Apple => write!(f, "Apple"),
            Platform::Google => write!(f, "Google"),
            Platform::Outlook => write!(f, "Outlook"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Calendar {
    pub id: String,
    pub platform: Platform,
    pub name: String,
    pub source: Option<String>,
    pub color_hex: Option<String>,
    pub source_type: String,
    pub is_subscribed: bool,
    pub allows_modifications: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub calendar_id: String,
    pub platform: Platform,
    pub title: String,
    pub description: String,
    pub participants: Vec<Participant>,
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,
    pub is_all_day: bool,
    pub location: Option<String>,
    pub url: Option<String>,
    pub status: String,
    pub availability: String,
    #[serde(default)]
    pub is_recurring: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Participant {
    pub name: String,
    pub email: Option<String>,
    pub is_organizer: bool,
    pub is_current_user: bool,
    pub role: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventFilter {
    pub from: DateTime<Utc>,
    pub to: DateTime<Utc>,
    pub calendar_tracking_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Opener {
    AppleScript(String),
    Url(String),
}

impl Event {
    pub fn opener(&self) -> anyhow::Result<Opener> {
        match self.platform {
            Platform::Apple => {
                let script = String::from(
                    "
                    tell application \"Calendar\"
                        activate
                        switch view to month view
                        view calendar at current date
                    end tell
                ",
                );

                Ok(Opener::AppleScript(script))
            }
            Platform::Google => {
                let url = self
                    .url
                    .as_ref()
                    .ok_or_else(|| anyhow::anyhow!("No URL available for Google event"))?
                    .clone();
                Ok(Opener::Url(url))
            }
            Platform::Outlook => {
                anyhow::bail!("Outlook is not supported yet");
            }
        }
    }
}

#[cfg(target_os = "macos")]
use itertools::Itertools;
#[cfg(target_os = "macos")]
use std::time::Duration;

#[cfg(target_os = "macos")]
use objc2::msg_send;

#[cfg(target_os = "macos")]
use block2::RcBlock;
#[cfg(target_os = "macos")]
use objc2::{rc::Retained, runtime::Bool, ClassType};
#[cfg(target_os = "macos")]
use objc2_contacts::{CNAuthorizationStatus, CNContactStore, CNEntityType};
#[cfg(target_os = "macos")]
use objc2_event_kit::{
    EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore, EKParticipant,
};
#[cfg(target_os = "macos")]
use objc2_foundation::{NSArray, NSDate, NSError, NSString};

#[cfg(target_os = "macos")]
pub struct Handle {
    event_store: Retained<EKEventStore>,
    contacts_store: Retained<CNContactStore>,
    calendar_access_granted: bool,
    contacts_access_granted: bool,
}

#[cfg(target_os = "macos")]
#[allow(clippy::new_without_default)]
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

        match rx.recv_timeout(Duration::from_secs(5)) {
            Ok(true) => self.calendar_access_granted = true,
            _ => self.calendar_access_granted = false,
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

        match rx.recv_timeout(Duration::from_secs(5)) {
            Ok(true) => self.contacts_access_granted = true,
            _ => self.contacts_access_granted = false,
        }
    }

    pub fn calendar_access_status(&self) -> bool {
        let status = unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
        matches!(status, EKAuthorizationStatus::FullAccess)
    }

    pub fn contacts_access_status(&self) -> bool {
        let status =
            unsafe { CNContactStore::authorizationStatusForEntityType(CNEntityType::Contacts) };
        matches!(status, CNAuthorizationStatus::Authorized)
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
            .map(|v| unsafe {
                NSDate::initWithTimeIntervalSince1970(NSDate::alloc(), v.timestamp() as f64)
            })
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

        let events = unsafe { self.event_store.eventsMatchingPredicate(&predicate) };
        events
    }

    fn transform_participant(
        &self,
        participant: &EKParticipant,
        is_current_user: bool,
    ) -> Participant {
        let name = unsafe { participant.name() }
            .unwrap_or_default()
            .to_string();

        let email = unsafe {
            let email_ns: *const NSString = msg_send![participant, emailAddress];
            email_ns.as_ref().map(|s| s.to_string())
        };

        let is_organizer = unsafe {
            let role: isize = msg_send![participant, participantRole];
            role == 3
        };

        let role = unsafe {
            let role: isize = msg_send![participant, participantRole];
            match role {
                0 => Some("unknown".to_string()),
                1 => Some("required".to_string()),
                2 => Some("optional".to_string()),
                3 => Some("chair".to_string()),
                4 => Some("non_participant".to_string()),
                _ => None,
            }
        };

        let status = unsafe {
            let status: isize = msg_send![participant, participantStatus];
            match status {
                0 => Some("unknown".to_string()),
                1 => Some("pending".to_string()),
                2 => Some("accepted".to_string()),
                3 => Some("declined".to_string()),
                4 => Some("tentative".to_string()),
                5 => Some("delegated".to_string()),
                6 => Some("completed".to_string()),
                7 => Some("in_process".to_string()),
                _ => None,
            }
        };

        Participant {
            name,
            email,
            is_organizer,
            is_current_user,
            role,
            status,
        }
    }
}

#[cfg(target_os = "macos")]
impl CalendarSource for Handle {
    async fn list_calendars(&self) -> Result<Vec<Calendar>, Error> {
        if !self.calendar_access_granted {
            return Err(anyhow::anyhow!("calendar_access_denied"));
        }

        let calendars = unsafe { self.event_store.calendars() };

        let list = calendars
            .iter()
            .map(|calendar| {
                let id = unsafe { calendar.calendarIdentifier() };
                let title = unsafe { calendar.title() };

                let (source_title, source_type) = unsafe {
                    match calendar.source() {
                        Some(source) => {
                            let title = source.as_ref().title().to_string();
                            let source_type: isize = msg_send![source.as_ref(), sourceType];
                            let type_str = match source_type {
                                0 => "local".to_string(),
                                1 => "exchange".to_string(),
                                2 => "caldav".to_string(),
                                3 => "mobile_me".to_string(),
                                4 => "subscribed".to_string(),
                                5 => "birthdays".to_string(),
                                _ => "unknown".to_string(),
                            };
                            (Some(title), type_str)
                        }
                        None => (None, "unknown".to_string()),
                    }
                };

                let color_hex = unsafe {
                    let color: *const objc2::runtime::AnyObject = msg_send![calendar, color];
                    if color.is_null() {
                        None
                    } else {
                        let red: f64 = msg_send![color, redComponent];
                        let green: f64 = msg_send![color, greenComponent];
                        let blue: f64 = msg_send![color, blueComponent];
                        Some(format!(
                            "#{:02X}{:02X}{:02X}",
                            (red * 255.0) as u8,
                            (green * 255.0) as u8,
                            (blue * 255.0) as u8
                        ))
                    }
                };

                let is_subscribed = unsafe {
                    let subscribed: Bool = msg_send![calendar, isSubscribed];
                    subscribed.as_bool()
                };

                let allows_modifications = unsafe {
                    let allows: Bool = msg_send![calendar, allowsContentModifications];
                    allows.as_bool()
                };

                Calendar {
                    id: id.to_string(),
                    platform: Platform::Apple,
                    name: title.to_string(),
                    source: source_title,
                    color_hex,
                    source_type,
                    is_subscribed,
                    allows_modifications,
                }
            })
            .sorted_by(|a, b| a.name.cmp(&b.name))
            .collect();

        Ok(list)
    }

    async fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, Error> {
        if !self.calendar_access_granted {
            return Err(anyhow::anyhow!("calendar_access_denied"));
        }

        let events = self
            .fetch_events(&filter)
            .iter()
            .filter_map(|event| {
                let id = unsafe { event.eventIdentifier() }?;
                let title = unsafe { event.title() };
                let description = unsafe { event.notes().unwrap_or_default() };
                let start_date = unsafe { event.startDate() };
                let end_date = unsafe { event.endDate() };

                let calendar = unsafe { event.calendar() }?;
                let calendar_id = unsafe { calendar.calendarIdentifier() };

                if !filter.calendar_tracking_id.eq(&calendar_id.to_string()) {
                    return None;
                }

                let is_recurring = unsafe {
                    let has_rules: Bool = msg_send![event, hasRecurrenceRules];
                    has_rules.as_bool()
                };

                let is_all_day = unsafe {
                    let all_day: Bool = msg_send![event, isAllDay];
                    all_day.as_bool()
                };

                let location = unsafe {
                    let loc: *const NSString = msg_send![event, location];
                    loc.as_ref().map(|s| s.to_string())
                };

                let url = unsafe {
                    let url_obj: *const objc2::runtime::AnyObject = msg_send![event, URL];
                    if url_obj.is_null() {
                        None
                    } else {
                        let url_str: *const NSString = msg_send![url_obj, absoluteString];
                        url_str.as_ref().map(|s| s.to_string())
                    }
                };

                let status = unsafe {
                    let status: isize = msg_send![event, status];
                    match status {
                        0 => "none".to_string(),
                        1 => "confirmed".to_string(),
                        2 => "tentative".to_string(),
                        3 => "cancelled".to_string(),
                        _ => "unknown".to_string(),
                    }
                };

                let availability = unsafe {
                    let avail: isize = msg_send![event, availability];
                    match avail {
                        -1 => "not_supported".to_string(),
                        0 => "busy".to_string(),
                        1 => "free".to_string(),
                        2 => "tentative".to_string(),
                        3 => "unavailable".to_string(),
                        _ => "unknown".to_string(),
                    }
                };

                let participants = unsafe { event.attendees().unwrap_or_default() };
                let participant_list: Vec<Participant> = participants
                    .iter()
                    .map(|p| {
                        let is_current_user = unsafe { p.isCurrentUser() };
                        self.transform_participant(p, is_current_user)
                    })
                    .collect();

                Some(Event {
                    id: id.to_string(),
                    calendar_id: calendar_id.to_string(),
                    platform: Platform::Apple,
                    title: title.to_string(),
                    description: description.to_string(),
                    participants: participant_list,
                    started_at: offset_date_time_from(start_date),
                    ended_at: offset_date_time_from(end_date),
                    is_all_day,
                    location,
                    url,
                    status,
                    availability,
                    is_recurring,
                })
            })
            .sorted_by(|a, b| a.started_at.cmp(&b.started_at))
            .collect();

        Ok(events)
    }
}

#[cfg(target_os = "macos")]
fn offset_date_time_from(date: Retained<NSDate>) -> chrono::DateTime<chrono::Utc> {
    let seconds = unsafe { date.timeIntervalSinceReferenceDate() };

    // Cocoa reference date is January 1, 2001, 00:00:00 UTC
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

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_time() {
        let now = unsafe { NSDate::new() };
        let now_from_nsdate = offset_date_time_from(now.to_owned());
        let now_from_chrono = chrono::Utc::now();
        let diff = (now_from_nsdate - now_from_chrono).num_seconds().abs();
        assert!(diff < 1);
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
            calendar_tracking_id: "".to_string(),
            from: chrono::Utc::now() - chrono::Duration::days(100),
            to: chrono::Utc::now() + chrono::Duration::days(100),
        };

        let events = handle.list_events(filter).await.unwrap();
        assert!(events.is_empty());
    }
}
