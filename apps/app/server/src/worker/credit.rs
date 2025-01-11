use apalis::prelude::Data;
use chrono::{DateTime, Utc};

use crate::state::WorkerState;

#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(_job: Job, _context: Data<WorkerState>) {}
