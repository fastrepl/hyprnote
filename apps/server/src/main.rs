use axum::{
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use shuttle_deepgram::deepgram::Deepgram;
use shuttle_runtime::SecretStore;
use shuttle_stytch::Client as Stytch;

use sqlx::PgPool;
use std::time::Duration;
use tower_http::timeout::TimeoutLayer;

mod auth;
mod enhance;
mod state;
mod transcribe;

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
    #[shuttle_shared_db::Postgres] db: PgPool,
    #[shuttle_stytch::Stytch(secret = "{secrets.STYTCH_API_KEY}")] stytch: Stytch,
    #[shuttle_deepgram::Deepgram(api_key = "{secrets.DEEPGRAM_API_KEY}")] deepgram: Deepgram,
) -> shuttle_axum::ShuttleAxum {
    sqlx::migrate!("./migrations").run(&db).await.unwrap();

    let state = state::AppState {
        reqwest: reqwest::Client::new(),
        secrets,
        db,
        stytch,
        deepgram,
    };

    let api_router = Router::new()
        .route(
            "/enhance",
            post(enhance::handler).layer(TimeoutLayer::new(Duration::from_secs(20))),
        )
        .route("/transcribe", get(transcribe::handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::middleware_fn,
        ));

    let router = Router::new()
        .nest("/api", api_router)
        .route("/health", get(health))
        .with_state(state);

    Ok(router.into())
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}
