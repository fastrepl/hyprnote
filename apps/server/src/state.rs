use axum::extract::FromRef;
use sqlx::PgPool;

use clerk_rs::clerk::Clerk;
use shuttle_runtime::SecretStore;

#[derive(Clone)]
pub struct AppState {
    pub secrets: SecretStore,
    pub reqwest: reqwest::Client,
    pub db: PgPool,
    pub clerk: Clerk,
    pub stt: hypr_stt::Client,
}

#[derive(Clone)]
pub struct MiddlewareState {
    pub db: PgPool,
}

impl FromRef<AppState> for MiddlewareState {
    fn from_ref(app_state: &AppState) -> MiddlewareState {
        MiddlewareState {
            db: app_state.db.clone(),
        }
    }
}
