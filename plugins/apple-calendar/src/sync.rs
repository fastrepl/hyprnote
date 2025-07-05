use chrono::Utc;

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

    let mut system_events_per_selected_calendar = std::collections::HashMap::new();
    for db_calendar in &db_selected_calendars {
        system_events_per_selected_calendar.insert(
            db_calendar.id.clone(),
            list_system_events(db_calendar.tracking_id.clone()).await,
        );
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
                    id: uuid::Uuid::new_v4().to_string(),
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

    // Collect all system events for rescheduled event detection
    let all_system_events: Vec<&hypr_calendar_interface::Event> =
        system_events_per_selected_calendar
            .values()
            .flatten()
            .collect();

    // Process existing events:
    // 1. Delete events from unselected calendars that have no sessions
    // 2. Handle rescheduled events (update instead of delete + create)
    // 3. Delete events that no longer exist in the system calendar
    for (db_event, session) in &db_events_with_session {
        let is_selected_cal = db_selected_calendars
            .iter()
            .any(|c| c.tracking_id == db_event.calendar_id.clone().unwrap_or_default());

        if !is_selected_cal && session.as_ref().map_or(true, |s| s.is_empty()) {
            state.to_delete.push(db_event.clone());
            continue;
        }

        if let Some(ref calendar_id) = db_event.calendar_id {
            if let Some(events) = system_events_per_selected_calendar.get(calendar_id) {
                // Check if event exists with same tracking_id
                if let Some(matching_event) = events.iter().find(|e| e.id == db_event.tracking_id) {
                    // Event exists with same tracking_id - it may have been updated
                    let updated_event = hypr_db_user::Event {
                        id: db_event.id.clone(), // Preserve the original database ID
                        tracking_id: matching_event.id.clone(),
                        user_id: user_id.clone(),
                        calendar_id: Some(calendar_id.clone()),
                        name: matching_event.name.clone(),
                        note: matching_event.note.clone(),
                        start_date: matching_event.start_date,
                        end_date: matching_event.end_date,
                        google_event_url: db_event.google_event_url.clone(), // Preserve any existing URL
                    };
                    state.to_update.push(updated_event);
                    continue;
                }

                // Check if this might be a rescheduled event (same name, calendar, but different tracking_id)
                if let Some(rescheduled_event) = find_potentially_rescheduled_event(
                    &db_event,
                    &all_system_events,
                    &db_selected_calendars,
                ) {
                    tracing::info!(
                        "Detected rescheduled event: {} -> {}, event: '{}'",
                        db_event.tracking_id,
                        rescheduled_event.id,
                        db_event.name
                    );

                    // Update the existing database event with new tracking_id and details
                    let updated_event = hypr_db_user::Event {
                        id: db_event.id.clone(), // Preserve the original database ID to keep user notes/sessions
                        tracking_id: rescheduled_event.id.clone(),
                        user_id: user_id.clone(),
                        calendar_id: db_event.calendar_id.clone(),
                        name: rescheduled_event.name.clone(),
                        note: rescheduled_event.note.clone(),
                        start_date: rescheduled_event.start_date,
                        end_date: rescheduled_event.end_date,
                        google_event_url: db_event.google_event_url.clone(),
                    };
                    state.to_update.push(updated_event);
                    continue;
                }

                // Event not found - mark for deletion
                tracing::info!(
                    "Event not found in system calendar, marking for deletion: {} '{}'",
                    db_event.tracking_id,
                    db_event.name
                );
                state.to_delete.push(db_event.clone());
            }
        }
    }

    // Add new events (that haven't been handled as updates)
    for db_calendar in db_selected_calendars {
        let fresh_events = system_events_per_selected_calendar
            .get(&db_calendar.id)
            .unwrap();

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
            };
            state.to_upsert.push(new_event);
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

async fn list_system_events(calendar_tracking_id: String) -> Vec<hypr_calendar_interface::Event> {
    tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar_apple::Handle::new();

        let filter = EventFilter {
            calendar_tracking_id,
            from: Utc::now(),
            to: Utc::now() + chrono::Duration::days(28),
        };

        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        rt.block_on(async { handle.list_events(filter).await.unwrap_or_default() })
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
