use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Duration, Utc};
use hypr_db_user::{ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific};

use crate::handler::{NotificationTrigger, NotificationTriggerEvent};

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

#[derive(Clone)]
pub struct WorkerState {
    pub db: hypr_db_user::UserDatabase,
    pub user_id: String,
    pub notification_tx: std::sync::mpsc::Sender<NotificationTrigger>,
}

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

const EVENT_NOTIFICATION_WORKER_NAKE: &str = "event_notification_worker";

#[tracing::instrument(skip(ctx), name = EVENT_NOTIFICATION_WORKER_NAKE)]
pub async fn perform_event_notification(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    tracing::info!("Event notification worker executing - checking for events in next 5 minutes");
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
        tracing::info!("found_upcoming_event: {}", event.name);

        let minutes_until_start = event
            .start_date
            .signed_duration_since(Utc::now())
            .num_minutes();

        if let Err(e) =
            ctx.notification_tx
                .send(NotificationTrigger::Event(NotificationTriggerEvent {
                    event_id: event.id.clone(),
                    event_name: event.name.clone(),
                    minutes_until_start,
                }))
        {
            tracing::error!("{}", e);
        }
    }

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
