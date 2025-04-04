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

const WORKER_NAME: &str = "apple_calendar_worker";

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

#[tracing::instrument(skip(ctx), name = "apple_calendar_worker")]
pub async fn perform(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    check_calendar_access().await?;

    let user_id = ctx.user_id.clone();
    let calendars = list_calendars().await.unwrap_or(vec![]);

    for calendar in calendars {
        let db_calendar = match ctx
            .db
            .upsert_calendar(hypr_db_user::Calendar {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: calendar.id.clone(),
                user_id: user_id.clone(),
                name: calendar.name.clone(),
                platform: calendar.platform.clone().into(),
                selected: false,
            })
            .await
        {
            Ok(cal) => cal,
            Err(e) => {
                tracing::error!("calendar_upsert_error: {:?}", e);
                continue;
            }
        };

        if !db_calendar.selected {
            continue;
        }

        let events: Vec<hypr_db_user::Event> = list_events(calendar.clone())
            .await
            .unwrap_or(vec![])
            .iter()
            .map(|e| hypr_db_user::Event {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: e.id.clone(),
                user_id: user_id.clone(),
                calendar_id: db_calendar.id.clone(),
                name: e.name.clone(),
                note: e.note.clone(),
                start_date: e.start_date,
                end_date: e.end_date,
                google_event_url: None,
            })
            .collect();

        for event in events {
            if let Err(e) = ctx.db.upsert_event(event).await {
                tracing::error!("event_upsert_error: {:?}", e);
            }
        }
    }

    Ok(())
}

async fn list_calendars() -> Result<Vec<Calendar>, String> {
    let mut calendars: Vec<Calendar> = Vec::new();

    let apple_calendars = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar_apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_calendars()).unwrap_or_default()
    })
    .await
    .map_err(|e| e.to_string())?;

    calendars.extend(apple_calendars);

    Ok(calendars)
}

async fn list_events(calendar: Calendar) -> Result<Vec<Event>, String> {
    let now = Utc::now();

    let mut events: Vec<Event> = Vec::new();

    let filter = EventFilter {
        calendars: vec![calendar],
        from: now,
        to: (now + chrono::Duration::days(28)),
    };

    let apple_events = tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar_apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_events(filter)).unwrap_or_default()
    })
    .await
    .map_err(|e| e.to_string())?;

    events.extend(apple_events);

    Ok(events)
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    let schedule = {
        use std::str::FromStr;
        apalis_cron::Schedule::from_str("*/10 * * * * *").unwrap()
    };

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new(WORKER_NAME)
                .data(state)
                .backend(apalis_cron::CronStream::new(schedule))
                .build_fn(perform)
        })
        .run()
        .await?;

    Ok(())
}
