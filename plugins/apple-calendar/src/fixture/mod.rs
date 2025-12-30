use std::sync::RwLock;

use json_patch::{Patch, patch};
use strum::{AsRefStr, EnumString, VariantNames};

use crate::types::{AppleCalendar, AppleEvent, EventFilter};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, EnumString, AsRefStr, VariantNames)]
#[strum(serialize_all = "snake_case")]
pub enum FixtureBase {
    #[default]
    Default,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, EnumString, AsRefStr, VariantNames)]
#[strum(serialize_all = "snake_case")]
pub enum FixtureSet {
    #[default]
    Default,
    EventAdded,
    EventRemoved,
    EventRescheduled,
}

static CURRENT_BASE: RwLock<FixtureBase> = RwLock::new(FixtureBase::Default);
static CURRENT_FIXTURE: RwLock<FixtureSet> = RwLock::new(FixtureSet::Default);

pub fn set_base(base: FixtureBase) {
    if let Ok(mut current) = CURRENT_BASE.write() {
        *current = base;
    }
}

pub fn get_base() -> FixtureBase {
    CURRENT_BASE.read().map(|b| *b).unwrap_or_default()
}

pub fn list_bases() -> &'static [&'static str] {
    FixtureBase::VARIANTS
}

pub fn set_fixture(fixture: FixtureSet) {
    if let Ok(mut current) = CURRENT_FIXTURE.write() {
        *current = fixture;
    }
}

pub fn get_fixture() -> FixtureSet {
    CURRENT_FIXTURE.read().map(|f| *f).unwrap_or_default()
}

macro_rules! include_base_calendars {
    (Default) => {
        include_str!("data/default/base/calendars.json")
    };
}

macro_rules! include_base_events {
    (Default) => {
        include_str!("data/default/base/events.json")
    };
}

macro_rules! include_patch {
    (Default, EventAdded) => {
        include_str!("data/default/patch/event_added.json")
    };
    (Default, EventRemoved) => {
        include_str!("data/default/patch/event_removed.json")
    };
    (Default, EventRescheduled) => {
        include_str!("data/default/patch/event_rescheduled.json")
    };
}

fn load_calendars(base: FixtureBase) -> Vec<AppleCalendar> {
    let data = match base {
        FixtureBase::Default => include_base_calendars!(Default),
    };
    serde_json::from_str(data).expect("Failed to parse fixture calendars.json")
}

fn load_base_events(base: FixtureBase) -> serde_json::Value {
    let data = match base {
        FixtureBase::Default => include_base_events!(Default),
    };
    serde_json::from_str(data).expect("Failed to parse base events.json")
}

fn load_patch(base: FixtureBase, fixture: FixtureSet) -> Option<Patch> {
    let patch_data = match (base, fixture) {
        (_, FixtureSet::Default) => return None,
        (FixtureBase::Default, FixtureSet::EventAdded) => include_patch!(Default, EventAdded),
        (FixtureBase::Default, FixtureSet::EventRemoved) => include_patch!(Default, EventRemoved),
        (FixtureBase::Default, FixtureSet::EventRescheduled) => {
            include_patch!(Default, EventRescheduled)
        }
    };
    Some(serde_json::from_str(patch_data).expect("Failed to parse patch file"))
}

fn load_events(base: FixtureBase, fixture: FixtureSet) -> Vec<AppleEvent> {
    let mut events = load_base_events(base);

    if let Some(p) = load_patch(base, fixture) {
        patch(&mut events, &p).expect("Failed to apply patch");
    }

    serde_json::from_value(events).expect("Failed to deserialize patched events")
}

pub fn list_calendars() -> Result<Vec<AppleCalendar>, String> {
    let base = get_base();
    Ok(load_calendars(base))
}

pub fn list_events(filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
    let base = get_base();
    let fixture = get_fixture();
    let all_events = load_events(base, fixture);

    let filtered_events: Vec<AppleEvent> = all_events
        .into_iter()
        .filter(|event| {
            event.calendar.id == filter.calendar_tracking_id
                && event.start_date >= filter.from
                && event.start_date <= filter.to
        })
        .collect();

    Ok(filtered_events)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_fixture_calendars() {
        let calendars = list_calendars().unwrap();
        assert!(!calendars.is_empty());
        assert_eq!(calendars[0].id, "fixture-calendar-1");
    }

    #[test]
    fn test_default_fixture_has_two_events() {
        let events = load_events(FixtureBase::Default, FixtureSet::Default);
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].event_identifier, "fixture-event-1");
        assert_eq!(events[1].event_identifier, "fixture-event-2");
    }

    #[test]
    fn test_event_added_fixture_has_three_events() {
        let events = load_events(FixtureBase::Default, FixtureSet::EventAdded);
        assert_eq!(events.len(), 3);
        assert_eq!(events[2].event_identifier, "fixture-event-3");
        assert_eq!(events[2].title, "New Client Call");
    }

    #[test]
    fn test_event_removed_fixture_has_one_event() {
        let events = load_events(FixtureBase::Default, FixtureSet::EventRemoved);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_identifier, "fixture-event-1");
    }

    #[test]
    fn test_event_rescheduled_fixture() {
        let events = load_events(FixtureBase::Default, FixtureSet::EventRescheduled);
        assert_eq!(events.len(), 2);
        assert_eq!(
            events[0].start_date.to_rfc3339(),
            "2025-01-02T10:00:00+00:00"
        );
        assert_eq!(events[1].event_identifier, "fixture-event-2-rescheduled");
        assert_eq!(events[1].notes.as_deref(), Some("Rescheduled to next day"));
    }

    #[test]
    fn test_switch_fixture() {
        set_fixture(FixtureSet::EventAdded);
        assert_eq!(get_fixture(), FixtureSet::EventAdded);

        set_fixture(FixtureSet::Default);
        assert_eq!(get_fixture(), FixtureSet::Default);
    }

    #[test]
    fn test_switch_base() {
        set_base(FixtureBase::Default);
        assert_eq!(get_base(), FixtureBase::Default);
    }

    #[test]
    fn test_list_bases() {
        let bases = list_bases();
        assert!(bases.contains(&"default"));
    }
}
