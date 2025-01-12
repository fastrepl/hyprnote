use apalis::prelude::{Data, Error};
use chrono::{DateTime, Utc};
use clerk_rs::endpoints::ClerkDynamicGetEndpoint;

use super::err_from;
use crate::state::WorkerState;
use hypr_calendar::CalendarSource;

#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    let user_id = "";
    let provider = "oauth_google";

    let _user_db = get_user_db("turso_db_url_from_admin_db", "turso_token_from_env").await;

    // https://clerk.com/docs/reference/backend-api/tag/Users#operation/GetOAuthAccessToken
    let token = ctx
        .clerk
        .get_with_params(
            ClerkDynamicGetEndpoint::GetOAuthAccessToken,
            vec![user_id, provider],
        )
        .await
        .map_err(|e| err_from(e.to_string()))?
        .to_string();

    let gcal = hypr_calendar::google::Handle::new(token).await;

    let now = time::OffsetDateTime::from_unix_timestamp(job.0.timestamp()).unwrap();

    let filter = hypr_calendar::EventFilter {
        calendar_id: "".to_string(),
        from: now - time::Duration::days(1),
        to: now + time::Duration::days(1),
    };
    let _events = gcal
        .list_events(filter)
        .await
        .map_err(|e| err_from(e.to_string()))?;

    Ok(())
}

async fn get_user_db(url: impl AsRef<str>, token: impl AsRef<str>) {
    let conn = hypr_db::ConnectionBuilder::new()
        .remote(url, token)
        .connect()
        .await
        .unwrap();

    hypr_db::user::UserDatabase::from(conn);
}
