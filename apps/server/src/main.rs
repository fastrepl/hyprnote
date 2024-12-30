use std::time::Duration;

use axum::{
    extract::FromRef,
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use tower_http::{
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
};

use clerk_rs::{
    clerk::Clerk,
    validators::{axum::ClerkLayer, jwks::MemoryCacheJwksProvider},
    ClerkConfiguration,
};
use shuttle_runtime::SecretStore;

use state::{AnalyticsState, AuthState};

mod analytics;
mod auth;
mod native;
mod state;
mod stripe;
mod web;

#[shuttle_runtime::main]
async fn main(#[shuttle_runtime::Secrets] secrets: SecretStore) -> shuttle_axum::ShuttleAxum {
    let clerk_config = ClerkConfiguration::new(
        None,
        None,
        Some(secrets.get("CLERK_SECRET_KEY").unwrap()),
        None,
    );
    let clerk = Clerk::new(clerk_config);

    let stt_config = hypr_stt::Config {
        deepgram_api_key: secrets.get("DEEPGRAM_API_KEY").unwrap(),
        clova_secret_key: secrets.get("CLOVA_SECRET_KEY").unwrap(),
    };
    let stt = hypr_stt::Client::new(stt_config);

    let admin_db_conn = hypr_db::ConnectionBuilder::new()
        .local("./admin.libsql")
        .connect()
        .await
        .unwrap();
    let admin_db = hypr_db::admin::AdminDatabase::from(admin_db_conn).await;

    let analytics = hypr_analytics::AnalyticsClient::new("TODO");

    let state = state::AppState {
        reqwest: reqwest::Client::new(),
        secrets,
        clerk: clerk.clone(),
        stt,
        admin_db,
        analytics,
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
        .layer(
            tower::builder::ServiceBuilder::new()
                .layer(middleware::from_fn_with_state(
                    AuthState::from_ref(&state),
                    auth::middleware_fn,
                ))
                .layer(middleware::from_fn_with_state(
                    AnalyticsState::from_ref(&state),
                    analytics::middleware_fn,
                )),
        );

    let webhook_router = Router::new().route("/stripe", post(stripe::webhook::handler));

    let router = Router::new()
        .route("/health", get(health))
        .nest("/api/native", native_router)
        .nest("/api/web", web_router)
        .nest("/webhook", webhook_router)
        .fallback_service({
            let web_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web");

            ServeDir::new(web_dir.join("dist"))
                .append_index_html_on_directories(false)
                .fallback(ServeFile::new(web_dir.join("dist/index.html")))
        })
        .with_state(state);

    Ok(router.into())
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}
