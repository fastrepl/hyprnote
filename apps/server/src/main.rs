use axum::{
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use shuttle_posthog::posthog::Client as Posthog;
use shuttle_runtime::SecretStore;

use sqlx::PgPool;
use std::time::Duration;
use tower_http::{
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
};

mod auth;
mod enhance;
mod openai;
mod state;
mod transcribe;

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
    #[shuttle_shared_db::Postgres] db: PgPool,
    #[shuttle_posthog::Posthog(
        api_base = "https://us.i.posthog.com",
        api_key = "{secrets.POSTHOG_API_KEY}"
    )]
    posthog: Posthog,
) -> shuttle_axum::ShuttleAxum {
    hypr_db_server::migrate(&db).await.unwrap();

    let state = state::AppState {
        reqwest: reqwest::Client::new(),
        secrets,
        db,
        posthog,
    };

    let api_router = Router::new()
        .route(
            "/enhance",
            post(enhance::handler).layer(TimeoutLayer::new(Duration::from_secs(20))),
        )
        .route(
            "/chat/completions",
            post(openai::handler).layer(TimeoutLayer::new(Duration::from_secs(10))),
        )
        .route("/transcribe", get(transcribe::handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::middleware_fn,
        ));

    let web_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web");

    let router = Router::new()
        .nest("/api", api_router)
        .route("/health", get(health))
        .fallback_service(
            ServeDir::new(web_dir.join("dist"))
                .append_index_html_on_directories(false)
                .fallback(ServeFile::new(web_dir.join("dist/index.html"))),
        )
        .with_state(state);

    Ok(router.into())
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}
