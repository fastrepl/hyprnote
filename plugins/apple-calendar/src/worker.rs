use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Utc};

use hypr_calendar_interface::{Calendar, CalendarSource, Event, EventFilter};

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

#[derive(Clone)]
pub struct WorkerState {
    pub db: hypr_db_user::UserDatabase,
    pub user_id: String,
}

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

const CALENDARS_SYNC_WORKER_NAME: &str = "apple_calendar_calendars_sync";
const EVENTS_SYNC_WORKER_NAME: &str = "apple_calendar_events_sync";

async fn check_calendar_access() -> Result<(), Error> {
    let calendar_access = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar_apple::Handle::new();
        handle.calendar_access_status()
    })
    .await
    .unwrap_or(false);

    if !calendar_access {
        return Err(crate::Error::CalendarAccessDenied.as_worker_error());
    }

    Ok(())
}

#[tracing::instrument(skip(ctx), name = "apple_calendar_calendars_sync")]
pub async fn perform_calendars_sync(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    check_calendar_access().await?;

    let db_calendars = ctx.db.list_calendars(&ctx.user_id).await.unwrap_or(vec![]);

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
                user_id: ctx.user_id.clone(),
                name: sys_c.name.clone(),
                platform: sys_c.platform.clone().into(),
                selected: false,
            })
            .collect::<Vec<hypr_db_user::Calendar>>();

        tracing::info!("calendars_to_upsert_len: {}", items.len());
        items
    };

    for calendar in calendars_to_delete {
        if let Err(e) = ctx.db.delete_calendar(&calendar.id).await {
            tracing::error!("delete_calendar_error: {}", e);
        }
    }

    for calendar in calendars_to_upsert {
        if let Err(e) = ctx.db.upsert_calendar(calendar).await {
            tracing::error!("upsert_calendar_error: {}", e);
        }
    }

    Ok(())
}

#[tracing::instrument(skip(ctx), name = "apple_calendar_events_sync")]
pub async fn perform_events_sync(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    check_calendar_access().await?;

    let user_id = ctx.user_id.clone();

    let db_selected_calendars = {
        let items = ctx
            .db
            .list_calendars(&ctx.user_id)
            .await
            .map_err(|e| crate::Error::DatabaseError(e.into()).as_worker_error())?
            .into_iter()
            .filter(|c| c.selected)
            .collect::<Vec<hypr_db_user::Calendar>>();

        tracing::info!("db_selected_calendars_len: {}", items.len());
        items
    };

    // TODO: we do not consider case where event is removed from calendar
    for db_calendar in db_selected_calendars {
        let events = list_events(Calendar {
            id: db_calendar.tracking_id,
            name: db_calendar.name,
            platform: db_calendar.platform.into(),
        })
        .await
        .unwrap();

        for e in events {
            if let Err(e) = ctx
                .db
                .upsert_event(hypr_db_user::Event {
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
                .await
            {
                tracing::error!("upsert_event_error: {}", e);
            }
        }
    }

    Ok(())
}

async fn list_events(calendar: Calendar) -> Result<Vec<Event>, String> {
    let now = Utc::now();

    let filter = EventFilter {
        calendars: vec![calendar],
        from: now,
        to: (now + chrono::Duration::days(28)),
    };

    let events = tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar_apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_events(filter)).unwrap_or_default()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(events)
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    #[cfg(target_os = "macos")]
    {
        use std::str::FromStr;

        apalis::prelude::Monitor::new()
            .register({
                WorkerBuilder::new(CALENDARS_SYNC_WORKER_NAME)
                    .data(state.clone())
                    .backend(apalis_cron::CronStream::new(
                        apalis_cron::Schedule::from_str("*/20 * * * * *").unwrap(),
                    ))
                    .build_fn(perform_calendars_sync)
            })
            .register({
                WorkerBuilder::new(EVENTS_SYNC_WORKER_NAME)
                    .data(state)
                    .backend(apalis_cron::CronStream::new(
                        apalis_cron::Schedule::from_str("*/10 * * * * *").unwrap(),
                    ))
                    .build_fn(perform_events_sync)
            })
            .run()
            .await?;
    }

    Ok(())
}
