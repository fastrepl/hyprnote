use axum::extract::FromRef;
use sqlx::PgPool;

use shuttle_posthog::posthog::Client as Posthog;
use shuttle_runtime::SecretStore;

#[derive(Clone)]
pub struct AppState {
    pub secrets: SecretStore,
    pub reqwest: reqwest::Client,
    pub db: PgPool,
    pub posthog: Posthog,
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
