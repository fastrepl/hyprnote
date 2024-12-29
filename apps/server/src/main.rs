use axum::{
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};

use clerk_rs::{
    clerk::Clerk,
    validators::{axum::ClerkLayer, jwks::MemoryCacheJwksProvider},
    ClerkConfiguration,
};
use shuttle_runtime::SecretStore;

use std::time::Duration;
use tower_http::{
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
};

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

    let state = state::AppState {
        reqwest: reqwest::Client::new(),
        secrets,
        clerk: clerk.clone(),
        stt,
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
