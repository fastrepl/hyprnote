use axum::extract::FromRef;
use sqlx::PgPool;

use shuttle_deepgram::deepgram::Deepgram;
use shuttle_openai::async_openai::{config::OpenAIConfig, Client as OpenAIClient};
use shuttle_stytch::Client as Stytch;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub stytch: Stytch,
    pub openai: OpenAIClient<OpenAIConfig>,
    pub deepgram: Deepgram,
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
