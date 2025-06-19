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

    // Process existing events:
    // 1. Delete events from unselected calendars that have no sessions
    // 2. Delete events that no longer exist in the system calendar
    for (db_event, session) in db_events_with_session {
        let is_selected_cal = db_selected_calendars
            .iter()
            .any(|c| c.tracking_id == db_event.calendar_id.clone().unwrap_or_default());

        if !is_selected_cal && session.map_or(true, |s| s.is_empty()) {
            state.to_delete.push(db_event.clone());
            continue;
        }

        if let Some(ref calendar_id) = db_event.calendar_id {
            if let Some(events) = system_events_per_selected_calendar.get(calendar_id) {
                if !events.iter().any(|e| e.id == db_event.tracking_id) {
                    state.to_delete.push(db_event.clone());
                    continue;
                }
            }
        }
    }

    for db_calendar in db_selected_calendars {
        let fresh_events = system_events_per_selected_calendar
            .get(&db_calendar.id)
            .unwrap();

        let events_to_upsert = fresh_events
            .iter()
            .map(|e| hypr_db_user::Event {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: e.id.clone(),
                user_id: user_id.clone(),
                calendar_id: Some(db_calendar.id.clone()),
                name: e.name.clone(),
                note: e.note.clone(),
                participants: e
                    .participants
                    .iter()
                    .map(|p| hypr_db_user::Participant {
                        name: p.name.clone(),
                        email: p.email.clone(),
                    })
                    .collect(),
                start_date: e.start_date,
                end_date: e.end_date,
                google_event_url: None,
            })
            .collect::<Vec<hypr_db_user::Event>>();

        state.to_upsert.extend(events_to_upsert);
    }

    Ok(state)
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
    }
}
