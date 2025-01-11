mod calendar;
mod credit;

use apalis::prelude::{WorkerBuilder, WorkerBuilderExt, WorkerFactoryFn};
use std::str::FromStr;

use crate::state::WorkerState;

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    let calendar_schedule = apalis_cron::Schedule::from_str("0 * * * *").unwrap();
    let credit_schedule = apalis_cron::Schedule::from_str("0 * * * *").unwrap();

    let calendar_ctx = state.clone();
    let credit_ctx = state;

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new("calendar")
                .concurrency(4)
                .data(calendar_ctx)
                .backend(apalis_cron::CronStream::new(calendar_schedule))
                .build_fn(calendar::perform)
        })
        .register({
            WorkerBuilder::new("credit")
                .concurrency(4)
                .data(credit_ctx)
                .backend(apalis_cron::CronStream::new(credit_schedule))
                .build_fn(credit::perform)
        })
        .run()
        .await
}
