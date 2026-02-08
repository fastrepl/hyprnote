//! Route definitions and router composition.
//!
//! This module defines all HTTP routes for the AI API server, including:
//! - Health check endpoint
//! - OpenAPI schema endpoint
//! - Protected routes for LLM and STT services

use std::sync::Arc;

use axum::{Router, middleware};
use hypr_analytics::AnalyticsClient;

use crate::auth::{self, AuthState};
use crate::env::Env;
use crate::openapi;

/// Builds the complete application router with all routes and middleware.
///
/// # Route Structure
///
/// ```text
/// GET  /health                    - Health check (no auth)
/// GET  /openapi.json             - OpenAPI schema (no auth)
///
/// Protected Routes (requires JWT auth):
/// POST /stt                       - Direct STT endpoint
/// GET  /listen                    - WebSocket listener for streaming STT
/// POST /llm                       - LLM completions
/// POST /chat/completions          - OpenAI-compatible chat completions
/// /stt/*                          - All STT proxy routes
/// /llm/*                          - All LLM proxy routes
/// ```
pub fn build_router(env: &Env, analytics: Arc<AnalyticsClient>) -> Router {
    let llm_config =
        hypr_llm_proxy::LlmProxyConfig::new(&env.llm).with_analytics(analytics.clone());
    let stt_config = hypr_transcribe_proxy::SttProxyConfig::new(&env.stt).with_analytics(analytics);
    let auth_state = AuthState::new(&env.supabase_url, crate::constants::REQUIRED_ENTITLEMENT);

    let protected_routes = build_protected_routes(llm_config, stt_config, auth_state);

    Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/openapi.json", axum::routing::get(openapi_handler))
        .merge(protected_routes)
}

/// Builds the protected routes that require authentication.
fn build_protected_routes(
    llm_config: hypr_llm_proxy::LlmProxyConfig,
    stt_config: hypr_transcribe_proxy::SttProxyConfig,
    auth_state: AuthState,
) -> Router {
    Router::new()
        .merge(hypr_transcribe_proxy::listen_router(stt_config.clone()))
        .merge(hypr_llm_proxy::chat_completions_router(llm_config.clone()))
        .nest("/stt", hypr_transcribe_proxy::router(stt_config))
        .nest("/llm", hypr_llm_proxy::router(llm_config))
        .route_layer(middleware::from_fn(auth::sentry_and_analytics))
        .route_layer(middleware::from_fn_with_state(
            auth_state,
            auth::require_auth,
        ))
}

/// Health check endpoint handler.
async fn health_check() -> &'static str {
    "ok"
}

/// OpenAPI schema endpoint handler.
async fn openapi_handler() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(openapi::openapi())
}
