mod auth;
mod env;

use std::net::SocketAddr;
use std::time::Duration;

use axum::{Router, body::Body, extract::MatchedPath, http::Request, middleware};
use sentry::integrations::tower::{NewSentryLayer, SentryHttpLayer};
use tower::ServiceBuilder;
use tower_http::{classify::ServerErrorsFailureClass, trace::TraceLayer};
use tracing_subscriber::prelude::*;

use auth::AuthState;
use env::env;

pub use auth::DEVICE_FINGERPRINT_HEADER;

fn app() -> Router {
    let llm_config = hypr_llm_proxy::LlmProxyConfig::new(&env().openrouter_api_key);
    let stt_config = hypr_transcribe_proxy::SttProxyConfig::new(env().api_keys());
    let auth_state = AuthState::new(&env().supabase_url);

    let protected_routes = Router::new()
        .nest("/stt", hypr_transcribe_proxy::router(stt_config))
        .nest("/llm", hypr_llm_proxy::router(llm_config))
        .route_layer(middleware::from_fn_with_state(
            auth_state,
            auth::require_pro,
        ));

    Router::new()
        .route("/health", axum::routing::get(|| async { "ok" }))
        .merge(protected_routes)
        .layer(
            ServiceBuilder::new()
                .layer(NewSentryLayer::<Request<Body>>::new_from_top())
                .layer(SentryHttpLayer::new().enable_transaction())
                .layer(
                    TraceLayer::new_for_http()
                        .make_span_with(|request: &Request<Body>| {
                            let path = request.uri().path();

                            if path == "/health" {
                                return tracing::Span::none();
                            }

                            let method = request.method();
                            let matched_path = request
                                .extensions()
                                .get::<MatchedPath>()
                                .map(MatchedPath::as_str)
                                .unwrap_or(path);
                            let (service, span_op) = match path {
                                p if p.starts_with("/llm") => ("llm", "http.server.llm"),
                                p if p.starts_with("/stt") => ("stt", "http.server.stt"),
                                _ => ("unknown", "http.server"),
                            };

                            tracing::info_span!(
                                "http_request",
                                method = %method,
                                http.route = %matched_path,
                                service = %service,
                                otel.name = %format!("{} {}", method, matched_path),
                                span.op = %span_op,
                            )
                        })
                        .on_request(|request: &Request<Body>, _span: &tracing::Span| {
                            // Skip logging for health checks
                            if request.uri().path() == "/health" {
                                return;
                            }
                            tracing::info!(
                                method = %request.method(),
                                path = %request.uri().path(),
                                "http_request_started"
                            );
                        })
                        .on_response(
                            |response: &axum::http::Response<axum::body::Body>,
                             latency: std::time::Duration,
                             span: &tracing::Span| {
                                if span.is_disabled() {
                                    return;
                                }
                                tracing::info!(
                                    parent: span,
                                    http_status = %response.status().as_u16(),
                                    latency_ms = %latency.as_millis(),
                                    "http_request_finished"
                                );
                            },
                        )
                        .on_failure(
                            |failure_class: ServerErrorsFailureClass,
                             latency: std::time::Duration,
                             span: &tracing::Span| {
                                if span.is_disabled() {
                                    return;
                                }
                                tracing::error!(
                                    parent: span,
                                    failure_class = ?failure_class,
                                    latency_ms = %latency.as_millis(),
                                    "http_request_failed"
                                );
                            },
                        ),
                ),
        )
}

fn main() -> std::io::Result<()> {
    let env = env();

    let _guard = sentry::init(sentry::ClientOptions {
        dsn: env.sentry_dsn.as_ref().and_then(|s| s.parse().ok()),
        release: option_env!("APP_VERSION").map(|v| format!("hyprnote-ai@{}", v).into()),
        environment: Some(
            if cfg!(debug_assertions) {
                "development"
            } else {
                "production"
            }
            .into(),
        ),
        traces_sample_rate: 1.0,
        sample_rate: 1.0,
        send_default_pii: true,
        auto_session_tracking: true,
        session_mode: sentry::SessionMode::Request,
        attach_stacktrace: true,
        max_breadcrumbs: 100,
        ..Default::default()
    });

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .with(sentry::integrations::tracing::layer())
        .init();

    env.log_configured_providers();

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async {
            let addr = SocketAddr::from(([0, 0, 0, 0], env.port));
            tracing::info!(addr = %addr, "server_listening");

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
    tracing::info!("shutdown_signal_received");
}
