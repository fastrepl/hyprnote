use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Utc};
use std::str::FromStr;

use hypr_calendar::CalendarSource;

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

#[derive(Clone)]
pub struct WorkerState {
    pub db: hypr_db::user::UserDatabase,
    pub user_id: String,
}

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    let calendar_access = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar::apple::Handle::new();
        handle.calendar_access_status()
    })
    .await
    .unwrap_or(false);

    if !calendar_access {
        return Err(err_from("calendar_access_denied"));
    }

    let user_id = ctx.user_id.clone();
    let calendars = list_calendars().await.unwrap_or(vec![]);

    for calendar in calendars {
        let _ = ctx
            .db
            .upsert_calendar(hypr_db::user::Calendar {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: calendar.id.clone(),
                user_id: user_id.clone(),
                name: calendar.name.clone(),
                platform: calendar.platform.clone().into(),
                selected: false,
            })
            .await
            .unwrap();

        let events: Vec<hypr_db::user::Event> = list_events(calendar.clone())
            .await
            .unwrap_or(vec![])
            .iter()
            .map(|e| hypr_db::user::Event {
                id: uuid::Uuid::new_v4().to_string(),
                tracking_id: e.id.clone(),
                user_id: user_id.clone(),
                calendar_id: calendar.id.clone(),
                name: e.name.clone(),
                note: e.note.clone(),
                start_date: e.start_date,
                end_date: e.end_date,
                google_event_url: None,
            })
            .collect();

        for event in events {
            let _ = ctx
                .db
                .upsert_event(event)
                .await
                .map_err(|e| err_from(e.to_string()))?;
        }
    }

    Ok(())
}

async fn list_calendars() -> Result<Vec<hypr_calendar::Calendar>, String> {
    let mut calendars: Vec<hypr_calendar::Calendar> = Vec::new();

    let apple_calendars = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar::apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_calendars()).unwrap_or_default()
    })
    .await
    .map_err(|e| e.to_string())?;

    calendars.extend(apple_calendars);

    Ok(calendars)
}

async fn list_events(
    calendar: hypr_calendar::Calendar,
) -> Result<Vec<hypr_calendar::Event>, String> {
    let now = Utc::now();

    let mut events: Vec<hypr_calendar::Event> = Vec::new();

    let filter = hypr_calendar::EventFilter {
        calendars: vec![calendar],
        from: (now - chrono::Duration::days(30)),
        to: (now + chrono::Duration::days(30)),
    };

    let apple_events = tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar::apple::Handle::new();
        tauri::async_runtime::block_on(handle.list_events(filter)).unwrap_or_default()
    })
    .await
    .map_err(|e| e.to_string())?;

    events.extend(apple_events);

    Ok(events)
}

fn err_from(e: impl Into<String>) -> Error {
    Error::Failed(std::sync::Arc::new(Box::new(std::io::Error::new(
        std::io::ErrorKind::Other,
        e.into(),
    ))))
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    let schedule = apalis_cron::Schedule::from_str("*/10 * * * * *").unwrap();

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new("calendar")
                .data(state)
                .backend(apalis_cron::CronStream::new(schedule))
                .build_fn(perform)
        })
        .run()
        .await?;

    Ok(())
}
