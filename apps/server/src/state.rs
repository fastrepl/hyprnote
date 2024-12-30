use axum::extract::FromRef;

use clerk_rs::clerk::Clerk;
use hypr_db::admin::AdminDatabase;
use shuttle_runtime::SecretStore;

#[derive(Clone)]
pub struct AppState {
    pub secrets: SecretStore,
    pub reqwest: reqwest::Client,
    pub clerk: Clerk,
    pub stt: hypr_stt::Client,
    pub admin_db: AdminDatabase,
}

#[derive(Clone)]
pub struct MiddlewareState {}

impl FromRef<AppState> for MiddlewareState {
    fn from_ref(app_state: &AppState) -> MiddlewareState {
        MiddlewareState {}
    }
}
