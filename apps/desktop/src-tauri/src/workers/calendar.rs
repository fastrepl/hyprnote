use apalis::prelude::Data;
use chrono::{DateTime, Utc};

use hypr_calendar::CalendarSource;

use super::WorkerState;

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(_job: Job, ctx: Data<WorkerState>) {
    let calendar_access = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar::apple::Handle::new();
        handle.calendar_access_status()
    })
    .await
    .unwrap_or(false);

    if !calendar_access {
        return;
    }

    let calendars = list_calendars().await.unwrap_or(vec![]);
    for calendar in calendars {
        let _ = ctx
            .db
            .upsert_calendar(calendar.clone().into())
            .await
            .unwrap();
        let events = list_events(calendar).await.unwrap_or(vec![]);
        for event in events {
            let _ = ctx.db.upsert_event(event.into()).await.unwrap();
        }
    }
}
async fn list_calendars() -> Result<Vec<hypr_calendar::Calendar>, String> {
    let mut calendars: Vec<hypr_calendar::Calendar> = Vec::new();

    let apple_calendars = tauri::async_runtime::spawn_blocking(|| {
        let handle = hypr_calendar::apple::Handle::new();
        futures::executor::block_on(handle.list_calendars()).unwrap_or(vec![])
    })
    .await
    .map_err(|e| e.to_string())?;

    calendars.extend(apple_calendars);

    Ok(calendars)
}

async fn list_events(
    calendar: hypr_calendar::Calendar,
) -> Result<Vec<hypr_calendar::Event>, String> {
    let now = time::OffsetDateTime::now_utc();

    let mut events: Vec<hypr_calendar::Event> = Vec::new();

    let filter = hypr_calendar::EventFilter {
        calendars: vec![calendar],
        from: now.checked_sub(time::Duration::days(30)).unwrap(),
        to: now.checked_add(time::Duration::days(30)).unwrap(),
    };

    let apple_events = tauri::async_runtime::spawn_blocking(move || {
        let handle = hypr_calendar::apple::Handle::new();
        futures::executor::block_on(handle.list_events(filter)).unwrap_or(vec![])
    })
    .await
    .map_err(|e| e.to_string())?;

    events.extend(apple_events);

    Ok(events)
}
