mod auth;
mod env;

use std::net::SocketAddr;
use std::time::Duration;

use axum::{Router, body::Body, http::Request};
use sentry::integrations::tower::{NewSentryLayer, SentryHttpLayer};
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

use env::env;

fn app() -> Router {
    let llm_config = hypr_llm_proxy::LlmProxyConfig::new(&env().openrouter_api_key);
    let stt_config = hypr_transcribe_proxy::SttProxyConfig::new(env().api_keys());

    Router::new()
        .route("/health", axum::routing::get(|| async { "ok" }))
        .nest("/stt", hypr_transcribe_proxy::router(stt_config))
        .nest("/llm", hypr_llm_proxy::router(llm_config))
        .layer(
            ServiceBuilder::new()
                .layer(NewSentryLayer::<Request<Body>>::new_from_top())
                .layer(SentryHttpLayer::new().enable_transaction())
                .layer(TraceLayer::new_for_http()),
        )
}

fn main() -> std::io::Result<()> {
    let env = env();

    let _guard = sentry::init(sentry::ClientOptions {
        dsn: env.sentry_dsn.as_ref().and_then(|s| s.parse().ok()),
        release: sentry::release_name!(),
        environment: env.sentry_environment.clone().map(Into::into),
        traces_sample_rate: 1.0,
        send_default_pii: true,
        auto_session_tracking: true,
        session_mode: sentry::SessionMode::Request,
        ..Default::default()
    });

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async {
            let addr = SocketAddr::from(([0, 0, 0, 0], env.port));
            tracing::info!("listening on {}", addr);

            let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
            axum::serve(listener, app())
                .with_graceful_shutdown(shutdown_signal())
                .await
                .unwrap();
        });

    if let Some(client) = sentry::Hub::current().client() {
        client.close(Some(Duration::from_secs(2)));
    }

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install CTRL+C signal handler");
    tracing::info!("shutting down");
}
