use std::net::SocketAddr;

use axum::{Router, extract::WebSocketUpgrade, response::IntoResponse, routing::any};
use hypr_transcribe_proxy::WebSocketProxy;
use tower_http::trace::TraceLayer;

fn app() -> Router {
    Router::new()
        .route("/ws", any(ws_handler))
        .layer(TraceLayer::new_for_http())
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    let proxy = WebSocketProxy::builder()
        .upstream_url("wss://example.com")
        .build();

    proxy.handle_upgrade(ws).await
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let _guard = sentry::init(sentry::ClientOptions {
        dsn: std::env::var("SENTRY_DSN")
            .ok()
            .and_then(|s| s.parse().ok()),
        ..Default::default()
    });

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
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
