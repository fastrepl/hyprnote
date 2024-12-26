use axum::{
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};

use shuttle_clerk::{ClerkClient as Clerk, ClerkLayer, MemoryCacheJwksProvider};
use shuttle_posthog::posthog::Client as Posthog;
use shuttle_runtime::SecretStore;
use shuttle_stt::STTClient as STT;

use sqlx::PgPool;
use std::time::Duration;
use tower_http::{
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
};

mod auth;
mod native;
mod state;
mod web;

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
    #[shuttle_shared_db::Postgres] db: PgPool,
    #[shuttle_clerk::Clerk(secret_key = "{secrets.CLERK_SECRET_KEY}")] clerk: Clerk,
    #[shuttle_posthog::Posthog(
        api_base = "https://us.i.posthog.com",
        api_key = "{secrets.POSTHOG_API_KEY}"
    )]
    posthog: Posthog,
    #[shuttle_stt::STT(
        deepgram_api_key = "{secrets.DEEPGRAM_API_KEY}",
        clova_api_key = "{secrets.CLOVA_API_KEY}"
    )]
    _stt: STT,
) -> shuttle_axum::ShuttleAxum {
    hypr_db_server::migrate(&db).await.unwrap();

    let state = state::AppState {
        reqwest: reqwest::Client::new(),
        secrets,
        db,
        posthog,
        clerk: clerk.clone(),
    };

    let web_router = Router::new()
        .route("/connect", get(web::connect::handler))
        .layer(ClerkLayer::new(
            MemoryCacheJwksProvider::new(clerk),
            None,
            true,
        ));

    let native_router = Router::new()
        .route(
            "/enhance",
            post(native::enhance::handler).layer(TimeoutLayer::new(Duration::from_secs(20))),
        )
        .route(
            "/chat/completions",
            post(native::openai::handler).layer(TimeoutLayer::new(Duration::from_secs(10))),
        )
        .route("/transcribe", get(native::transcribe::handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::middleware_fn,
        ));

    let web_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web");

    let router = Router::new()
        .nest("/api/native", native_router)
        .nest("/api/web", web_router)
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
