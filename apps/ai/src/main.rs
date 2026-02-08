//! Hyprnote AI API Server
//!
//! A lightweight AI services gateway that provides:
//! - Speech-to-text (STT) transcription endpoints
//! - Large Language Model (LLM) chat completion endpoints
//! - Authentication via Supabase JWT tokens
//! - Analytics and error tracking
//!
//! # Architecture
//!
//! This server acts as a reverse proxy and authentication layer for specialized
//! AI service crates (`hypr-llm-proxy` and `hypr-transcribe-proxy`). It handles:
//! - Request authentication and authorization
//! - User context injection for analytics
//! - Error tracking and distributed tracing
//! - CORS and middleware composition

mod auth;
mod constants;
mod env;
mod middleware;
mod observability;
mod openapi;
mod routes;
mod server;

use std::sync::Arc;
use std::time::Duration;

use hypr_analytics::AnalyticsClientBuilder;

use env::env;

fn main() -> std::io::Result<()> {
    let env = env();

    // Initialize observability
    let _sentry_guard = observability::init_sentry(env.sentry_dsn.as_deref());
    observability::init_tracing();

    // Log configured STT providers for debugging
    hypr_transcribe_proxy::ApiKeys::from(&env.stt).log_configured_providers();

    // Build analytics client
    let analytics = build_analytics_client(env);

    // Build application router with all middleware
    let app = routes::build_router(env, analytics)
        .layer(middleware::cors_layer())
        .layer(middleware::observability_layer());

    // Run the server
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async {
            if let Err(e) = server::run(app, env.port).await {
                tracing::error!(error = ?e, "server_error");
                return Err(e);
            }
            Ok(())
        })?;

    // Graceful shutdown: flush Sentry events
    observability::shutdown_sentry(Duration::from_secs(2));

    Ok(())
}

/// Builds the analytics client with optional PostHog integration.
fn build_analytics_client(env: &env::Env) -> Arc<hypr_analytics::AnalyticsClient> {
    let mut builder = AnalyticsClientBuilder::default();
    if let Some(key) = &env.posthog_api_key {
        builder = builder.with_posthog(key);
    }
    Arc::new(builder.build())
}
