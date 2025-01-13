use apalis::prelude::{Data, Error};
use chrono::{DateTime, Utc};

use super::err_from;
use crate::state::WorkerState;
use hypr_calendar::CalendarSource;
use hypr_nango::{NangoCredentials, NangoGetConnectionResponse, NangoIntegration};

#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

pub async fn perform(job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    let users = ctx
        .admin_db
        .list_users()
        .await
        .map_err(|e| err_from(e.to_string()))?;

    let mut gcal_integrations = vec![];
    for user in users {
        let integrations = ctx
            .admin_db
            .list_integrations(user.id)
            .await
            .map_err(|e| err_from(e.to_string()))?
            .into_iter()
            .filter(|i| i.nango_integration_id == NangoIntegration::GoogleCalendar)
            .collect::<Vec<_>>();
        gcal_integrations.extend(integrations);
    }

    for integration in gcal_integrations {
        if let NangoGetConnectionResponse::Ok(connection) = ctx
            .nango
            .get_connection(integration.nango_connection_id)
            .await
            .map_err(|e| err_from(e.to_string()))?
        {
            let NangoCredentials::OAuth2(c) = connection.credentials;

            let gcal = hypr_calendar::google::Handle::new(c.access_token).await;

            let now = time::OffsetDateTime::from_unix_timestamp(job.0.timestamp()).unwrap();

            let filter = hypr_calendar::EventFilter {
                calendars: vec![],
                from: now - time::Duration::days(1),
                to: now + time::Duration::days(1),
            };
            let _events = gcal
                .list_events(filter)
                .await
                .map_err(|e| err_from(e.to_string()))?;
            let _user_db = get_user_db("turso_db_url_from_admin_db", &ctx.turso.api_key).await;
        }
    }

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
