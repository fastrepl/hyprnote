use apalis::prelude::*;
use apalis_cron::{CronStream, Schedule};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use clerk_rs::{clerk::Clerk, endpoints::ClerkDynamicGetEndpoint, ClerkConfiguration};
use hypr_db::admin::AdminDatabase;

#[derive(Default, Debug, Clone)]
struct Reminder(DateTime<Utc>);

impl From<DateTime<Utc>> for Reminder {
    fn from(t: DateTime<Utc>) -> Self {
        Reminder(t)
    }
}

pub async fn monitor() -> std::io::Result<()> {
    let schedule = Schedule::from_str("@daily").unwrap();
    let worker = WorkerBuilder::new("worker")
        .backend(CronStream::new(schedule))
        .build_fn(sync_calendar_events);

    Monitor::new().register(worker).run().await
}

async fn sync_calendar_events(job: Reminder) {
    // Do reminder stuff
}

pub async fn fetch(admin_db: AdminDatabase, clerk: Clerk) {
    let user_id = "";
    let provider = "oauth_google";

    let user_db = get_user_db("turso_db_url_from_admin_db", "turso_token_from_env").await;

    // https://clerk.com/docs/reference/backend-api/tag/Users#operation/GetOAuthAccessToken
    let token = clerk
        .get_with_params(
            ClerkDynamicGetEndpoint::GetOAuthAccessToken,
            vec![user_id, provider],
        )
        .await;
}

async fn get_user_db(url: impl AsRef<str>, token: impl AsRef<str>) {
    let conn = hypr_db::ConnectionBuilder::new()
        .remote(url, token)
        .connect()
        .await
        .unwrap();

    hypr_db::user::UserDatabase::from(conn);
}
