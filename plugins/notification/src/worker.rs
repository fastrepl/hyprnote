use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Duration, Utc};
use hypr_db_user::{ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific};

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

const EVENT_NOTIFICATION_WORKER_NAKE: &str = "event_notification_worker";

#[tracing::instrument(skip(ctx), name = EVENT_NOTIFICATION_WORKER_NAKE)]
pub async fn perform_event_notification(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    let latest_event = ctx
        .db
        .list_events(Some(ListEventFilter {
            common: ListEventFilterCommon {
                user_id: ctx.user_id.clone(),
                limit: Some(1),
            },
            specific: ListEventFilterSpecific::DateRange {
                start: Utc::now(),
                end: Utc::now() + Duration::minutes(5),
            },
        }))
        .await
        .map_err(|e| crate::Error::Db(e).as_worker_error())?;

    if let Some(event) = latest_event.first() {
        hypr_notification2::show(hypr_notification2::Notification {
            title: "Meeting starting in 5 minutes".to_string(),
            message: event.name.clone(),
            url: Some(format!("hypr://notification?event_id={}", event.id)),
            timeout: Some(std::time::Duration::from_secs(10)),
        });
    }

    // Enhanced auto-start logic with broader time window
    // Note: For now, we'll use a simplified approach until we get the dependencies working
    tracing::debug!(
        "Enhanced auto-start logic would run here - checking for events in broader time window"
    );

    Ok(())
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    use std::str::FromStr;

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new(EVENT_NOTIFICATION_WORKER_NAKE)
                .data(state.clone())
                .backend(apalis_cron::CronStream::new(
                    apalis_cron::Schedule::from_str("0 * * * * *").unwrap(),
                ))
                .build_fn(perform_event_notification)
        })
        .run()
        .await?;

    Ok(())
}
