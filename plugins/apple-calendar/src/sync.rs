use chrono::Utc;
use hypr_calendar_interface::{Calendar, CalendarSource, Event, EventFilter};

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

    for calendar in calendars_to_delete {
        if let Err(e) = db.delete_calendar(&calendar.id).await {
            tracing::error!("delete_calendar_error: {}", e);
        }
    }

    for calendar in calendars_to_upsert {
        if let Err(e) = db.upsert_calendar(calendar).await {
            tracing::error!("upsert_calendar_error: {}", e);
        }
    }

    Ok(())
}

pub async fn sync_events(
    db: hypr_db_user::UserDatabase,
    user_id: String,
) -> Result<(), crate::Error> {
    check_calendar_access().await?;

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

    let now = Utc::now();
    let future_date = now + chrono::Duration::days(28);

    for db_calendar in db_selected_calendars {
        let fresh_events = list_events(
            Calendar {
                id: db_calendar.tracking_id,
                name: db_calendar.name,
                platform: db_calendar.platform.into(),
                source: None,
            },
            now,
            future_date,
        )
        .await
        .map_err(|e| {
            tracing::error!("list_events_error: {}", e);
            e
        })
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

        for e in events_to_upsert {
            if let Err(e) = db.upsert_event(e).await {
                tracing::error!("upsert_event_error: {}", e);
            }
        }
    }

    Ok(())
}

pub async fn list_events(
    calendar: Calendar,
    from: chrono::DateTime<Utc>,
    to: chrono::DateTime<Utc>,
) -> Result<Vec<Event>, String> {
    let filter = EventFilter {
        calendars: vec![calendar],
        from,
        to,
    };

    let events = tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar_apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_events(filter)).unwrap_or_default()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(events)
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
