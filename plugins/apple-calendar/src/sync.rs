use chrono::Utc;
use serde_json;

use hypr_calendar_interface::{CalendarSource, EventFilter};
use hypr_db_user::{
    GetSessionFilter, ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific,
};

pub async fn sync_calendars(
    db: hypr_db_user::UserDatabase,
    user_id: String,
) -> Result<(), crate::Error> {
    check_calendar_access().await?;

    let db_calendars = db.list_calendars(&user_id).await.unwrap_or(vec![]);
    let system_calendars = list_system_calendars().await;

    _sync_calendars(user_id, db_calendars, system_calendars)
        .await?
        .execute(&db)
        .await;

    Ok(())
}

pub async fn sync_events(
    db: hypr_db_user::UserDatabase,
    user_id: String,
) -> Result<(), crate::Error> {
    check_calendar_access().await?;

    let db_events_with_session = list_db_events_with_session(&db, &user_id).await?;
    let db_selected_calendars = list_db_calendars_selected(&db, &user_id).await?;

    // Batch API call instead of individual calls
    let calendar_tracking_ids: Vec<String> = db_selected_calendars
        .iter()
        .map(|cal| cal.tracking_id.clone())
        .collect();

    let system_events_per_tracking_id =
        list_system_events_for_calendars(calendar_tracking_ids).await;

    // Convert from tracking_id -> database_id mapping
    let mut system_events_per_selected_calendar = std::collections::HashMap::new();
    for db_calendar in &db_selected_calendars {
        let events = system_events_per_tracking_id
            .get(&db_calendar.tracking_id)
            .unwrap_or(&vec![])
            .clone();
        system_events_per_selected_calendar.insert(db_calendar.id.clone(), events);
    }

    _sync_events(
        user_id,
        db_events_with_session,
        db_selected_calendars,
        system_events_per_selected_calendar,
    )
    .await?
    .execute(&db)
    .await;

    Ok(())
}

async fn _sync_calendars(
    user_id: String,
    db_calendars: Vec<hypr_db_user::Calendar>,
    system_calendars: Vec<hypr_calendar_interface::Calendar>,
) -> Result<CalendarSyncState, crate::Error> {
    let calendars_to_delete = {
        let items = db_calendars
            .iter()
            .filter(|db_c| {
                !system_calendars
                    .iter()
                    .any(|sys_c| sys_c.id == db_c.tracking_id)
            })
            .cloned()
            .collect::<Vec<hypr_db_user::Calendar>>();

        tracing::info!("calendars_to_delete_len: {}", items.len());
        items
    };

    let calendars_to_upsert = {
        let items = system_calendars
            .iter()
            .map(|sys_c| {
                let existing = db_calendars
                    .iter()
                    .find(|db_c| db_c.tracking_id == sys_c.id);

                hypr_db_user::Calendar {
                    id: existing.map_or(uuid::Uuid::new_v4().to_string(), |c| c.id.clone()),
                    tracking_id: sys_c.id.clone(),
                    user_id: user_id.clone(),
                    name: sys_c.name.clone(),
                    platform: sys_c.platform.clone().into(),
                    selected: existing.map_or(false, |c| c.selected),
                    source: sys_c.source.clone(),
                }
            })
            .collect::<Vec<hypr_db_user::Calendar>>();

        tracing::info!("calendars_to_upsert_len: {}", items.len());
        items
    };

    Ok(CalendarSyncState {
        to_delete: calendars_to_delete,
        to_upsert: calendars_to_upsert,
    })
}

async fn _sync_events(
    user_id: String,
    db_events_with_session: Vec<(hypr_db_user::Event, Option<hypr_db_user::Session>)>,
    db_selected_calendars: Vec<hypr_db_user::Calendar>,
    system_events_per_selected_calendar: std::collections::HashMap<
        String,
        Vec<hypr_calendar_interface::Event>,
    >,
) -> Result<EventSyncState, crate::Error> {
    let mut state = EventSyncState::default();

    // Track system events that have been handled to prevent duplicates
    let mut handled_system_event_ids = std::collections::HashSet::<String>::new();

    // Collect all system events for rescheduled event detection
    let all_system_events: Vec<&hypr_calendar_interface::Event> =
        system_events_per_selected_calendar
            .values()
            .flatten()
            .collect();

    // Process existing events:
    for (db_event, session) in &db_events_with_session {
        let is_selected_cal = db_selected_calendars
            .iter()
            .any(|c| c.id == db_event.calendar_id.clone().unwrap_or_default());

        if !is_selected_cal && session.as_ref().map_or(true, |s| s.is_empty()) {
            state.to_delete.push(db_event.clone());
            continue;
        }

        if let Some(ref calendar_id) = db_event.calendar_id {
            if let Some(events) = system_events_per_selected_calendar.get(calendar_id) {
                // Check if event exists with same tracking_id
                if let Some(matching_event) = events.iter().find(|e| e.id == db_event.tracking_id) {
                    let updated_event = hypr_db_user::Event {
                        id: db_event.id.clone(),
                        tracking_id: matching_event.id.clone(),
                        user_id: user_id.clone(),
                        calendar_id: Some(calendar_id.clone()),
                        name: matching_event.name.clone(),
                        note: matching_event.note.clone(),
                        start_date: matching_event.start_date,
                        end_date: matching_event.end_date,
                        google_event_url: db_event.google_event_url.clone(),
                        participants: Some(
                            serde_json::to_string(&matching_event.participants)
                                .unwrap_or_else(|_| "[]".to_string()),
                        ),
                    };
                    state.to_update.push(updated_event);

                    // Mark this system event as handled
                    handled_system_event_ids.insert(matching_event.id.clone());
                    continue;
                }

                // Check for rescheduled events
                if let Some(rescheduled_event) = find_potentially_rescheduled_event(
                    &db_event,
                    &all_system_events,
                    &db_selected_calendars,
                ) {
                    let updated_event = hypr_db_user::Event {
                        id: db_event.id.clone(),
                        tracking_id: rescheduled_event.id.clone(),
                        user_id: user_id.clone(),
                        calendar_id: db_event.calendar_id.clone(),
                        name: rescheduled_event.name.clone(),
                        note: rescheduled_event.note.clone(),
                        start_date: rescheduled_event.start_date,
                        end_date: rescheduled_event.end_date,
                        google_event_url: db_event.google_event_url.clone(),
                        participants: Some(
                            serde_json::to_string(&rescheduled_event.participants)
                                .unwrap_or_else(|_| "[]".to_string()),
                        ),
                    };
                    state.to_update.push(updated_event);

                    // Mark this rescheduled system event as handled to prevent duplicate creation
                    handled_system_event_ids.insert(rescheduled_event.id.clone());
                    continue;
                }

                state.to_delete.push(db_event.clone());
            } else {
                state.to_delete.push(db_event.clone());
            }
        } else {
            state.to_delete.push(db_event.clone());
        }
    }

    // Add new events (that haven't been handled as updates)
    for db_calendar in db_selected_calendars {
        if let Some(fresh_events) = system_events_per_selected_calendar.get(&db_calendar.id) {
            for system_event in fresh_events {
                // Skip if this event was already handled as an update
                let already_handled = state
                    .to_update
                    .iter()
                    .any(|e| e.tracking_id == system_event.id);
                if already_handled {
                    continue;
                }

                // Skip if this event already exists in the database with the same tracking_id
                let already_exists = db_events_with_session
                    .iter()
                    .any(|(db_event, _)| db_event.tracking_id == system_event.id);
                if already_exists {
                    continue;
                }

                // This is a genuinely new event
                let new_event = hypr_db_user::Event {
                    id: uuid::Uuid::new_v4().to_string(),
                    tracking_id: system_event.id.clone(),
                    user_id: user_id.clone(),
                    calendar_id: Some(db_calendar.id.clone()),
                    name: system_event.name.clone(),
                    note: system_event.note.clone(),
                    start_date: system_event.start_date,
                    end_date: system_event.end_date,
                    google_event_url: None,
                    participants: Some(
                        serde_json::to_string(&system_event.participants)
                            .unwrap_or_else(|_| "[]".to_string()),
                    ),
                };
                state.to_upsert.push(new_event);
            }
        }
    }

    Ok(state)
}

fn find_potentially_rescheduled_event<'a>(
    db_event: &hypr_db_user::Event,
    system_events: &'a [&hypr_calendar_interface::Event],
    db_calendars: &[hypr_db_user::Calendar],
) -> Option<&'a hypr_calendar_interface::Event> {
    // Find the tracking_id of the database calendar to match against system events
    let db_calendar_tracking_id = db_event.calendar_id.as_ref().and_then(|db_cal_id| {
        db_calendars
            .iter()
            .find(|cal| cal.id == *db_cal_id)
            .map(|cal| &cal.tracking_id)
    });

    system_events
        .iter()
        .find(|sys_event| {
            // Must have the same name
            sys_event.name == db_event.name &&
            // Must belong to the same calendar (compare tracking IDs)
            db_calendar_tracking_id == Some(&sys_event.calendar_id) &&
            // Allow for reasonable time difference (within 30 days for rescheduling)
            (sys_event.start_date - db_event.start_date).num_days().abs() <= 30 &&
            // Must not have the same tracking_id (otherwise it's not rescheduled)
            sys_event.id != db_event.tracking_id
        })
        .copied()
}

async fn list_system_calendars() -> Vec<hypr_calendar_interface::Calendar> {
    tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar_apple::Handle::new();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        rt.block_on(async { handle.list_calendars().await.unwrap_or_default() })
    })
    .await
    .unwrap_or_default()
}

async fn list_system_events_for_calendars(
    calendar_tracking_ids: Vec<String>,
) -> std::collections::HashMap<String, Vec<hypr_calendar_interface::Event>> {
    let now = Utc::now();

    for (i, id) in calendar_tracking_ids.iter().enumerate() {
        tracing::info!("  Calendar {}: tracking_id={}", i + 1, id);
    }

    tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar_apple::Handle::new();

        let mut results = std::collections::HashMap::new();

        for (i, calendar_tracking_id) in calendar_tracking_ids.iter().enumerate() {
            let filter = EventFilter {
                calendar_tracking_id: calendar_tracking_id.clone(),
                from: now,
                to: now + chrono::Duration::days(28),
            };

            // Add small delay between API calls to avoid overwhelming EventKit
            if i > 0 {
                std::thread::sleep(std::time::Duration::from_millis(50));
                tracing::info!("  Applied 50ms delay after calendar {}", i);
            }

            let events = match tokio::runtime::Handle::try_current() {
                Ok(rt) => {
                    tracing::info!("  Using existing tokio runtime");
                    rt.block_on(handle.list_events(filter)).unwrap_or_default()
                }
                Err(_) => {
                    tracing::info!("  Creating new tokio runtime");
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .unwrap();
                    rt.block_on(handle.list_events(filter)).unwrap_or_default()
                }
            };

            results.insert(calendar_tracking_id.clone(), events);
        }

        results
    })
    .await
    .unwrap_or_default()
}

async fn list_db_calendars(
    db: &hypr_db_user::UserDatabase,
    user_id: impl Into<String>,
) -> Result<Vec<hypr_db_user::Calendar>, crate::Error> {
    let items = db
        .list_calendars(user_id.into())
        .await
        .map_err(|e| crate::Error::DatabaseError(e))?
        .into_iter()
        .collect::<Vec<hypr_db_user::Calendar>>();

    Ok(items)
}

async fn list_db_calendars_selected(
    db: &hypr_db_user::UserDatabase,
    user_id: impl Into<String>,
) -> Result<Vec<hypr_db_user::Calendar>, crate::Error> {
    let items = list_db_calendars(db, user_id)
        .await?
        .into_iter()
        .filter(|c| c.selected)
        .collect::<Vec<hypr_db_user::Calendar>>();

    Ok(items)
}

async fn list_db_events(
    db: &hypr_db_user::UserDatabase,
    user_id: impl Into<String>,
) -> Result<Vec<hypr_db_user::Event>, crate::Error> {
    let events = db
        .list_events(Some(ListEventFilter {
            common: ListEventFilterCommon {
                user_id: user_id.into(),
                limit: Some(200),
            },
            specific: ListEventFilterSpecific::DateRange {
                start: Utc::now(),
                end: Utc::now() + chrono::Duration::days(28),
            },
        }))
        .await
        .map_err(|e| crate::Error::DatabaseError(e))?
        .into_iter()
        .collect::<Vec<hypr_db_user::Event>>();

    Ok(events)
}

async fn list_db_events_with_session(
    db: &hypr_db_user::UserDatabase,
    user_id: impl Into<String>,
) -> Result<Vec<(hypr_db_user::Event, Option<hypr_db_user::Session>)>, crate::Error> {
    let events = list_db_events(db, user_id).await?;

    let mut events_with_session = Vec::new();

    for event in events {
        let session = db
            .get_session(GetSessionFilter::CalendarEventId(event.id.clone()))
            .await
            .map_err(|e| crate::Error::DatabaseError(e.into()))?;

        events_with_session.push((event, session));
    }

    Ok(events_with_session)
}

async fn check_calendar_access() -> Result<(), crate::Error> {
    let calendar_access = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar_apple::Handle::new();
        handle.calendar_access_status()
    })
    .await
    .unwrap_or(false);

    if !calendar_access {
        return Err(crate::Error::CalendarAccessDenied);
    }

    Ok(())
}

#[derive(Debug, Default)]
struct CalendarSyncState {
    to_delete: Vec<hypr_db_user::Calendar>,
    to_upsert: Vec<hypr_db_user::Calendar>,
}

#[derive(Debug, Default)]
struct EventSyncState {
    to_delete: Vec<hypr_db_user::Event>,
    to_upsert: Vec<hypr_db_user::Event>,
    to_update: Vec<hypr_db_user::Event>,
}

impl CalendarSyncState {
    async fn execute(self, db: &hypr_db_user::UserDatabase) {
        for calendar in self.to_delete {
            if let Err(e) = db.delete_calendar(&calendar.id).await {
                tracing::error!("delete_calendar_error: {}", e);
            }
        }

        for calendar in self.to_upsert {
            if let Err(e) = db.upsert_calendar(calendar).await {
                tracing::error!("upsert_calendar_error: {}", e);
            }
        }
    }
}

impl EventSyncState {
    async fn execute(self, db: &hypr_db_user::UserDatabase) {
        for event in self.to_delete {
            if let Err(e) = db.delete_event(&event.id).await {
                tracing::error!("delete_event_error: {}", e);
            }
        }

        for event in self.to_update {
            if let Err(e) = db.update_event(event).await {
                tracing::error!("update_event_error: {}", e);
            }
        }

        for event in self.to_upsert {
            if let Err(e) = db.upsert_event(event).await {
                tracing::error!("upsert_event_error: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sync_calendars() {
        let state = _sync_calendars("TEST".to_string(), vec![], vec![])
            .await
            .unwrap();

        assert!(state.to_delete.is_empty());
        assert!(state.to_upsert.is_empty());
    }

    #[tokio::test]
    async fn test_sync_events() {
        let state = _sync_events(
            "TEST".to_string(),
            vec![],
            vec![],
            std::collections::HashMap::new(),
        )
        .await
        .unwrap();

        assert!(state.to_delete.is_empty());
        assert!(state.to_upsert.is_empty());
        assert!(state.to_update.is_empty());
    }
}
