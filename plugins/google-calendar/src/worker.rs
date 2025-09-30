use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::GoogleCalendarPluginExt;

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

#[derive(Clone)]
pub struct WorkerState {
    pub db: hypr_db_user::UserDatabase,
    pub user_id: String,
    pub app_handle: tauri::AppHandle<tauri::Wry>,
}

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

const CALENDARS_SYNC_WORKER_NAME: &str = "google_calendar_calendars_sync";
const EVENTS_SYNC_WORKER_NAME: &str = "google_calendar_events_sync";

#[tracing::instrument(skip(ctx), name = CALENDARS_SYNC_WORKER_NAME)]
pub async fn perform_calendars_sync(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    ctx.app_handle.sync_calendars_with_db(ctx.db.clone(), ctx.user_id.clone())
        .await
        .map_err(|e| Error::Failed(Arc::new(Box::new(e) as Box<dyn std::error::Error + Send + Sync>)))?;
    Ok(())
}

#[tracing::instrument(skip(ctx), name = EVENTS_SYNC_WORKER_NAME)]
pub async fn perform_events_sync(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    ctx.app_handle.sync_events_with_db(ctx.db.clone(), ctx.user_id.clone(), None)
        .await
        .map_err(|e| Error::Failed(Arc::new(Box::new(e) as Box<dyn std::error::Error + Send + Sync>)))?;
    Ok(())
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    use std::str::FromStr;

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new(CALENDARS_SYNC_WORKER_NAME)
                .data(state.clone())
                .backend(apalis_cron::CronStream::new(
                    apalis_cron::Schedule::from_str("0 */10 * * * *").unwrap(),
                ))
                .build_fn(perform_calendars_sync)
        })
        .register({
            WorkerBuilder::new(EVENTS_SYNC_WORKER_NAME)
                .data(state)
                .backend(apalis_cron::CronStream::new(
                    apalis_cron::Schedule::from_str("0 */5 * * * *").unwrap(),
                ))
                .build_fn(perform_events_sync)
        })
        .run()
        .await?;

    Ok(())
}
