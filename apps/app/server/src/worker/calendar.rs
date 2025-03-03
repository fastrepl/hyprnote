use apalis::prelude::{Data, Error};
use chrono::{DateTime, Utc};

use super::err_from;
use crate::state::WorkerState;
use hypr_calendar::CalendarSource;
use hypr_nango::{NangoCredentials, NangoGetConnectionResponse, NangoIntegration};

#[allow(unused)]
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

    for user in users {
        let gcal_integrations = ctx
            .admin_db
            .list_integrations(user.id)
            .await
            .map_err(|e| err_from(e.to_string()))?
            .into_iter()
            .filter(|i| i.nango_integration_id == NangoIntegration::GoogleCalendar)
            .collect::<Vec<_>>();

        for integration in gcal_integrations {
            if let NangoGetConnectionResponse::Ok(connection) = ctx
                .nango
                .get_connection(integration.nango_connection_id)
                .await
                .map_err(|e| err_from(e.to_string()))?
            {
                let NangoCredentials::OAuth2(c) = connection.credentials;

                let gcal = hypr_calendar::google::Handle::new(c.access_token).await;

                let now = DateTime::<Utc>::from_timestamp(job.0.timestamp(), 0).unwrap();

                let filter = hypr_calendar::EventFilter {
                    calendars: vec![],
                    from: now - chrono::Duration::days(1),
                    to: now + chrono::Duration::days(1),
                };
                let events = gcal
                    .list_events(filter)
                    .await
                    .map_err(|e| err_from(e.to_string()))?;

                let user_db = {
                    let account = ctx
                        .admin_db
                        .get_account_by_id(&user.account_id)
                        .await
                        .map_err(|e| err_from(e.to_string()))?
                        .unwrap();

                    let url = ctx.turso.db_url(&account.turso_db_name);
                    let token = ctx
                        .turso
                        .generate_db_token(&account.turso_db_name)
                        .await
                        .map_err(|e| err_from(e.to_string()))?;

                    let conn = hypr_db_core::DatabaseBaseBuilder::default()
                        .remote(url, token)
                        .build()
                        .await
                        .map_err(|e| err_from(e.to_string()))?
                        .connect()
                        .map_err(|e| err_from(e.to_string()))?;

                    hypr_db_user::UserDatabase::from(conn)
                };

                for e in events {
                    // TODO

                    // let event = hypr_db_user::Event {
                    //     id: uuid::Uuid::new_v4().to_string(),
                    //     tracking_id: e.id.clone(),
                    //     user_id: user_id.clone(),
                    //     calendar_id: calendar.id.clone(),
                    //     name: e.name.clone(),
                    //     note: e.note.clone(),
                    //     start_date: e.start_date,
                    //     end_date: e.end_date,
                    //     google_event_url: None,
                    // };
                    // let _ = user_db.upsert_event(event).await;
                }
            }
        }
    }

    Ok(())
}
