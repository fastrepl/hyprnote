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

    let system_calendars = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar_apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_calendars()).unwrap_or_default()
    })
    .await
    .unwrap_or_default();

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
            .filter(|sys_c| !db_calendars.iter().any(|db_c| db_c.tracking_id == sys_c.id))
            .map(|sys_c| hypr_db_user::Calendar {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: sys_c.id.clone(),
                user_id: user_id.clone(),
                name: sys_c.name.clone(),
                platform: sys_c.platform.clone().into(),
                selected: false,
                source: sys_c.source.clone(),
            })
            .collect::<Vec<hypr_db_user::Calendar>>();

        tracing::info!("calendars_to_upsert_len: {}", items.len());
        items
    };

    let state = CalendarSyncState {
        to_delete: calendars_to_delete,
        to_upsert: calendars_to_upsert,
    };

    state.execute(db).await;
    Ok(())
}

// 1. For selected calendars: we fetch ~28D future events and insert them.
//    - Event updates are handled through upsert operations.
// 2. For ~28D future events: if the attached calendar is de-selected, we should remove them.
//    - The only exception is when an event has an attached note.
pub async fn sync_events(
    db: hypr_db_user::UserDatabase,
    user_id: String,
) -> Result<(), crate::Error> {
    check_calendar_access().await?;

    let mut state = EventSyncState {
        to_delete: vec![],
        to_upsert: vec![],
    };

    let user_id = user_id.clone();

    let db_selected_calendars = {
        let items = db
            .list_calendars(&user_id)
            .await
            .map_err(|e| crate::Error::DatabaseError(e.into()))?
            .into_iter()
            .filter(|c| c.selected)
            .collect::<Vec<hypr_db_user::Calendar>>();

        tracing::info!("db_selected_calendars_len: {}", items.len());
        items
    };

    let db_existing_events = {
        let items = db
            .list_events(Some(ListEventFilter {
                common: ListEventFilterCommon {
                    user_id: user_id.clone(),
                    limit: Some(200),
                },
                specific: ListEventFilterSpecific::DateRange {
                    start: Utc::now(),
                    end: Utc::now() + chrono::Duration::days(28),
                },
            }))
            .await
            .map_err(|e| crate::Error::DatabaseError(e.into()))?
            .into_iter()
            .collect::<Vec<hypr_db_user::Event>>();

        tracing::info!("db_existing_events_len: {}", items.len());
        items
    };

    for db_event in db_existing_events {
        let session = db
            .get_session(GetSessionFilter::CalendarEventId(db_event.id.clone()))
            .await
            .map_err(|e| crate::Error::DatabaseError(e.into()))?;

        let is_selected_cal = db_selected_calendars
            .iter()
            .any(|c| c.tracking_id == db_event.calendar_id.clone().unwrap_or_default());

        if is_selected_cal && session.is_none() {
            state.to_delete.push(db_event);
        }
    }

    for db_calendar in db_selected_calendars {
        let fresh_events = tauri::async_runtime::spawn_blocking(move || {
            let handle = hypr_calendar_apple::Handle::new();

            let filter = EventFilter {
                calendar_tracking_id: db_calendar.tracking_id,
                from: Utc::now(),
                to: Utc::now() + chrono::Duration::days(28),
            };

            let events =
                tauri::async_runtime::block_on(handle.list_events(filter)).unwrap_or_default();

            tracing::info!(
                "calendar: {}, events: {:?}",
                db_calendar.name,
                events
                    .iter()
                    .map(|e| e.name.clone())
                    .collect::<Vec<String>>()
            );
            events
        })
        .await
        .unwrap_or_default();

        let events_to_upsert = fresh_events
            .iter()
            .map(|e| hypr_db_user::Event {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: e.id.clone(),
                user_id: user_id.clone(),
                calendar_id: Some(db_calendar.id.clone()),
                name: e.name.clone(),
                note: e.note.clone(),
                start_date: e.start_date,
                end_date: e.end_date,
                google_event_url: None,
            })
            .collect::<Vec<hypr_db_user::Event>>();

        state.to_upsert.extend(events_to_upsert);
    }

    state.execute(db).await;
    Ok(())
}

pub async fn check_calendar_access() -> Result<(), crate::Error> {
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

struct CalendarSyncState {
    to_delete: Vec<hypr_db_user::Calendar>,
    to_upsert: Vec<hypr_db_user::Calendar>,
}

struct EventSyncState {
    to_delete: Vec<hypr_db_user::Event>,
    to_upsert: Vec<hypr_db_user::Event>,
}

impl CalendarSyncState {
    async fn execute(self, db: hypr_db_user::UserDatabase) {
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
    async fn execute(self, db: hypr_db_user::UserDatabase) {
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
