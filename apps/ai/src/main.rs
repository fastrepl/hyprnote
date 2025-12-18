mod auth;
mod env;
mod handlers;

use std::net::SocketAddr;

use axum::{Router, routing::any};
use tower_http::trace::TraceLayer;

use env::env;
use handlers::ws_handler;

fn app() -> Router {
    let llm_config = hypr_llm_proxy::LlmProxyConfig::new(&env().openrouter_api_key);

    Router::new()
        .route("/stt", any(ws_handler))
        .nest("/llm", hypr_llm_proxy::router(llm_config))
        .layer(TraceLayer::new_for_http())
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let env = env();

    let _guard = sentry::init(sentry::ClientOptions {
        dsn: env.sentry_dsn.as_ref().and_then(|s| s.parse().ok()),
        ..Default::default()
    });

    let addr = SocketAddr::from(([0, 0, 0, 0], env.port));
    tracing::info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install CTRL+C signal handler");
    tracing::info!("shutting down");
}
