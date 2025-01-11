use apalis::prelude::Data;
use chrono::{DateTime, Utc};
use clerk_rs::endpoints::ClerkDynamicGetEndpoint;

use crate::state::WorkerState;

#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(_job: Job, ctx: Data<WorkerState>) {
    let user_id = "";
    let provider = "oauth_google";

    let _user_db = get_user_db("turso_db_url_from_admin_db", "turso_token_from_env").await;

    // https://clerk.com/docs/reference/backend-api/tag/Users#operation/GetOAuthAccessToken
    let _token = ctx
        .clerk
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
