mod calendar;
mod notification;

use apalis::prelude::{Error, WorkerBuilder, WorkerBuilderExt, WorkerFactoryFn};
use hypr_db::user::UserDatabase;
use std::str::FromStr;

#[derive(Clone)]
pub struct WorkerState {
    pub db: UserDatabase,
}

fn err_from(e: impl Into<String>) -> Error {
    Error::Failed(std::sync::Arc::new(Box::new(std::io::Error::new(
        std::io::ErrorKind::Other,
        e.into(),
    ))))
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    let calendar_schedule = apalis_cron::Schedule::from_str("0 * * * *").unwrap();
    let credit_schedule = apalis_cron::Schedule::from_str("0 * * * *").unwrap();

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new("calendar")
                .data(state)
                .backend(apalis_cron::CronStream::new(calendar_schedule))
                .build_fn(calendar::perform)
        })
        .run()
        .await
}
