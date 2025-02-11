use std::str::FromStr;

use apalis::prelude::{Error, WorkerBuilder, WorkerFactoryFn};
use hypr_db::user::UserDatabase;

#[cfg(target_os = "macos")]
mod calendar;
mod notification;

#[derive(Clone)]
pub struct WorkerState {
    pub db: UserDatabase,
    pub user_id: String,
}

fn err_from(e: impl Into<String>) -> Error {
    Error::Failed(std::sync::Arc::new(Box::new(std::io::Error::new(
        std::io::ErrorKind::Other,
        e.into(),
    ))))
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    {
        let schedule = apalis_cron::Schedule::from_str("*/10 * * * * *").unwrap();
        apalis::prelude::Monitor::new()
            .register({
                WorkerBuilder::new("notification")
                    .data(state.clone())
                    .backend(apalis_cron::CronStream::new(schedule))
                    .build_fn(notification::perform)
            })
            .run()
            .await?;
    }

    #[cfg(target_os = "macos")]
    {
        let schedule = apalis_cron::Schedule::from_str("*/10 * * * * *").unwrap();
        apalis::prelude::Monitor::new()
            .register({
                WorkerBuilder::new("calendar")
                    .data(state)
                    .backend(apalis_cron::CronStream::new(schedule))
                    .build_fn(calendar::perform)
            })
            .run()
            .await?;
    }

    Ok(())
}
