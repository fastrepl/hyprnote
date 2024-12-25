use axum::extract::FromRef;
use sqlx::PgPool;

use shuttle_deepgram::deepgram::Deepgram;
use shuttle_posthog::posthog::Client as Posthog;
use shuttle_runtime::SecretStore;
use shuttle_stytch::Client as Stytch;

#[derive(Clone)]
pub struct AppState {
    pub secrets: SecretStore,
    pub reqwest: reqwest::Client,
    pub db: PgPool,
    pub stytch: Stytch,
    pub deepgram: Deepgram,
    pub posthog: Posthog,
}

#[derive(Clone)]
pub struct MiddlewareState {
    pub db: PgPool,
    pub stytch: Stytch,
}

impl FromRef<AppState> for MiddlewareState {
    fn from_ref(app_state: &AppState) -> MiddlewareState {
        MiddlewareState {
            db: app_state.db.clone(),
            stytch: app_state.stytch.clone(),
        }
    }
}
