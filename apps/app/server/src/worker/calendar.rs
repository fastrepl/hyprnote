use std::collections::HashMap;

use apalis::prelude::{Data, Error};
use chrono::{DateTime, Utc};

use crate::state::WorkerState;
use hypr_calendar_interface::CalendarSource;
use hypr_nango::{NangoCredentials, NangoIntegration};

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

#[tracing::instrument(skip(ctx))]
pub async fn perform(job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    let now = DateTime::<Utc>::from_timestamp(job.0.timestamp(), 0).unwrap();

    let users = ctx
        .admin_db
        .list_users()
        .await
        .map_err(|e| Into::<crate::Error>::into(e).as_worker_error())?;

    for user in users {
        let user_id = user.id.clone();
        let user_db = {
            let account = ctx
                .admin_db
                .get_account_by_id(&user.account_id)
                .await
                .map_err(|e| Into::<crate::Error>::into(e).as_worker_error())?
                .unwrap();

            let url = ctx.turso.format_db_url(&account.turso_db_name);
            let token = ctx
                .turso
                .generate_db_token(&account.turso_db_name)
                .await
                .map_err(|e| Into::<crate::Error>::into(e).as_worker_error())?;

            let base_db = hypr_db_core::DatabaseBuilder::default()
                .remote(url, token)
                .build()
                .await
                .map_err(|e| Into::<crate::Error>::into(e).as_worker_error())?;

            hypr_db_user::UserDatabase::from(base_db)
        };

        let integrations = ctx
            .admin_db
            .list_integrations(user.id)
            .await
            .map_err(|e| Into::<crate::Error>::into(e).as_worker_error())?;

        let integration_groups: HashMap<NangoIntegration, Vec<hypr_db_admin::Integration>> =
            integrations
                .into_iter()
                .fold(HashMap::new(), |mut acc, integration| {
                    let integration_id = integration.nango_integration_id.clone();
                    acc.entry(integration_id)
                        .or_insert_with(Vec::new)
                        .push(integration);
                    acc
                });

        for (kind, integrations) in integration_groups {
            for integration in integrations {
                let token = get_oauth_access_token(&ctx.nango, &integration)
                    .await
                    .map_err(|e| e.as_worker_error())?;

                assert!(kind == NangoIntegration::GoogleCalendar);
                let gcal = hypr_calendar_google::Handle::new(token).await;

                let filter = hypr_calendar_interface::EventFilter {
                    calendar_tracking_id: "TODO".to_string(),
                    from: now - chrono::Duration::days(1),
                    to: now + chrono::Duration::days(1),
                };
                let events = gcal
                    .list_events(filter)
                    .await
                    .map_err(|e| Into::<crate::Error>::into(e).as_worker_error())?;

                for e in events {
                    let event = hypr_db_user::Event {
                        id: uuid::Uuid::new_v4().to_string(),
                        tracking_id: e.id.clone(),
                        user_id: user_id.clone(),
                        calendar_id: Some("TODO".to_string()),
                        name: e.name.clone(),
                        note: e.note.clone(),
                        start_date: e.start_date,
                        end_date: e.end_date,
                        google_event_url: None,
                    };

                    let _ = user_db.upsert_event(event).await;
                }
            }
        }
    }

    Ok(())
}

async fn get_oauth_access_token(
    nango: &hypr_nango::NangoClient,
    integration: &hypr_db_admin::Integration,
) -> Result<String, crate::Error> {
    let connection = nango
        .get_connection(integration.nango_connection_id.clone())
        .await?;

    let NangoCredentials::OAuth2(c) = connection.credentials;
    Ok(c.access_token)
}
