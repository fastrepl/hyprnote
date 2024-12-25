use axum::{
    handler::Handler,
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use shuttle_deepgram::deepgram::Deepgram;
use shuttle_openai::async_openai::{config::OpenAIConfig, Client as OpenAIClient};
use shuttle_runtime::SecretStore;
use sqlx::PgPool;
use std::time::Duration;
use tower_http::timeout::TimeoutLayer;

mod auth;
mod enhance;
mod transcribe;

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
    #[shuttle_shared_db::Postgres] pool: PgPool,
    #[shuttle_deepgram::Deepgram(api_key = "{secrets.DEEPGRAM_API_KEY}")] deepgram: Deepgram,
    #[shuttle_openai::OpenAI(api_key = "{secrets.OPENAI_API_KEY}")] openai: OpenAIClient<
        OpenAIConfig,
    >,
) -> shuttle_axum::ShuttleAxum {
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

    let state = AppState { db: pool };

    let api_router = Router::new()
        .route(
            "/enhance",
            post(enhance::handler.layer(TimeoutLayer::new(Duration::from_secs(20)))),
        )
        .route("/transcribe", get(transcribe::handler))
        .layer(middleware::from_fn(auth::middleware_fn));

    let router = Router::new()
        .nest("/api", api_router)
        .route("/health", get(health))
        .with_state(state);

    Ok(router.into())
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}
