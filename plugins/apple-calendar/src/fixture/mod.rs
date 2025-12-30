use crate::types::{AppleCalendar, AppleEvent, EventFilter};

pub enum FixtureSet {
    Default,
}

impl Default for FixtureSet {
    fn default() -> Self {
        Self::Default
    }
}

static CURRENT_FIXTURE: std::sync::OnceLock<FixtureSet> = std::sync::OnceLock::new();

pub fn set_fixture(fixture: FixtureSet) {
    let _ = CURRENT_FIXTURE.set(fixture);
}

pub fn get_fixture() -> &'static FixtureSet {
    CURRENT_FIXTURE.get_or_init(FixtureSet::default)
}

fn load_calendars(fixture: &FixtureSet) -> Vec<AppleCalendar> {
    match fixture {
        FixtureSet::Default => {
            let data = include_str!("data/default/calendars.json");
            serde_json::from_str(data).expect("Failed to parse fixture calendars.json")
        }
    }
}

fn load_events(fixture: &FixtureSet) -> Vec<AppleEvent> {
    match fixture {
        FixtureSet::Default => {
            let data = include_str!("data/default/events.json");
            serde_json::from_str(data).expect("Failed to parse fixture events.json")
        }
    }
}

pub fn list_calendars() -> Result<Vec<AppleCalendar>, String> {
    let fixture = get_fixture();
    Ok(load_calendars(fixture))
}

pub fn list_events(filter: EventFilter) -> Result<Vec<AppleEvent>, String> {
    let fixture = get_fixture();
    let all_events = load_events(fixture);

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
    fn test_load_fixture_events() {
        let filter = EventFilter {
            from: chrono::DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&chrono::Utc),
            to: chrono::DateTime::parse_from_rfc3339("2025-01-03T00:00:00Z")
                .unwrap()
                .with_timezone(&chrono::Utc),
            calendar_tracking_id: "fixture-calendar-1".to_string(),
        };
        let events = list_events(filter).unwrap();
        assert!(!events.is_empty());
    }
}
