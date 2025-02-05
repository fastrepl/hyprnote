use apalis::prelude::{Data, Error};
use chrono::{DateTime, Utc};
use tauri_plugin_notification::NotificationExt;

use super::{err_from, WorkerState};

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    // ctx.app
    //     .notification()
    //     .builder()
    //     .title("Hyprnote")
    //     .body("test")
    //     .show()
    //     .map_err(|e| err_from(e.to_string()))?;

    Ok(())
}
