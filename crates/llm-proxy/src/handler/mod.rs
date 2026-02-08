//! HTTP handlers for chat completion requests

mod non_streaming;
mod streaming;

use non_streaming::*;
use streaming::*;

use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    Json, Router,
    extract::{FromRequestParts, State},
    http::request::Parts,
    response::{IntoResponse, Response},
    routing::post,
};
use backon::{ExponentialBuilder, Retryable};
use reqwest::Client;

use crate::analytics::{AnalyticsReporter, GenerationEvent};
use crate::config::LlmProxyConfig;
use crate::error::{Error, is_retryable};
use crate::types::{ChatCompletionRequest, ToolChoice};

/// Report analytics with cost information
async fn report_with_cost(
    analytics: &dyn AnalyticsReporter,
    provider: &dyn crate::provider::Provider,
    client: &Client,
    api_key: &str,
    mut event: GenerationEvent,
) {
    event.total_cost = provider
        .fetch_cost(client, api_key, &event.generation_id)
        .await;
    analytics.report_generation(event).await;
}

/// Spawn a background task to report analytics with cost information
pub(super) fn spawn_analytics_report(
    analytics: Option<Arc<dyn AnalyticsReporter>>,
    provider: Arc<dyn crate::provider::Provider>,
    client: Client,
    api_key: String,
    event: GenerationEvent,
) {
    if let Some(analytics) = analytics {
        tokio::spawn(async move {
            report_with_cost(&*analytics, &*provider, &client, &api_key, event).await;
        });
    }
}

/// Shared application state for handlers
#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: LlmProxyConfig,
    pub(crate) client: Client,
}

/// Create a router with routes for both `/` and `/chat/completions`
pub fn router(config: LlmProxyConfig) -> Router {
    let state = AppState {
        config,
        client: Client::new(),
    };

    Router::new()
        .route("/", post(completions_handler))
        .route("/chat/completions", post(completions_handler))
        .with_state(state)
}

/// Create a router with only the `/chat/completions` route
pub fn chat_completions_router(config: LlmProxyConfig) -> Router {
    let state = AppState {
        config,
        client: Client::new(),
    };

    Router::new()
        .route("/chat/completions", post(completions_handler))
        .with_state(state)
}

use hypr_analytics::{AuthenticatedUserId, DeviceFingerprint};

/// Analytics context extracted from request extensions
pub struct AnalyticsContext {
    pub fingerprint: Option<String>,
    pub user_id: Option<String>,
}

impl<S> FromRequestParts<S> for AnalyticsContext
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let fingerprint = parts
            .extensions
            .get::<DeviceFingerprint>()
            .map(|id| id.0.clone());
        let user_id = parts
            .extensions
            .get::<AuthenticatedUserId>()
            .map(|id| id.0.clone());
        Ok(AnalyticsContext {
            fingerprint,
            user_id,
        })
    }
}

async fn completions_handler(
    State(state): State<AppState>,
    analytics_ctx: AnalyticsContext,
    Json(request): Json<ChatCompletionRequest>,
) -> Response {
    let start_time = Instant::now();

    let needs_tool_calling = request.tools.as_ref().is_some_and(|t| !t.is_empty())
        && !matches!(&request.tool_choice, Some(ToolChoice::String(s)) if s == "none");

    let models = if needs_tool_calling {
        state.config.models_tool_calling.clone()
    } else {
        state.config.models_default.clone()
    };

    let stream = request.stream.unwrap_or(false);

    tracing::info!(
        stream = %stream,
        has_tools = %needs_tool_calling,
        message_count = %request.messages.len(),
        model_count = %models.len(),
        provider = %state.config.provider.name(),
        "llm_completion_request_received"
    );

    let provider = &state.config.provider;

    sentry::configure_scope(|scope| {
        scope.set_tag("llm.provider", provider.name());
        if let Some(model) = models.first() {
            scope.set_tag("llm.model", model);
        }
        scope.set_tag("llm.stream", stream.to_string());
        scope.set_tag("llm.tool_calling", needs_tool_calling.to_string());

        let mut ctx = BTreeMap::new();
        ctx.insert("model_count".into(), models.len().into());
        ctx.insert("message_count".into(), request.messages.len().into());
        ctx.insert("has_tools".into(), needs_tool_calling.into());
        scope.set_context("llm_request", sentry::protocol::Context::Other(ctx));
    });

    let provider_request = match provider.build_request(&request, models, stream) {
        Ok(req) => req,
        Err(e) => return Error::InvalidRequest(e).into_response(),
    };

    let retry_config = &state.config.retry_config;
    let backoff = ExponentialBuilder::default()
        .with_jitter()
        .with_max_delay(Duration::from_secs(retry_config.max_delay_secs))
        .with_max_times(retry_config.num_retries);

    let result = tokio::time::timeout(state.config.timeout, async {
        (|| async {
            let mut req_builder = state
                .client
                .post(provider.base_url())
                .header("Content-Type", "application/json")
                .header(
                    "Authorization",
                    provider.build_auth_header(&state.config.api_key),
                );

            for (key, value) in provider.additional_headers() {
                req_builder = req_builder.header(key, value);
            }

            req_builder.json(&provider_request).send().await
        })
        .retry(backoff)
        .notify(|err, dur: Duration| {
            tracing::warn!(
                error = %err,
                retry_delay_ms = dur.as_millis(),
                provider = %provider.name(),
                "retrying_llm_request"
            );
        })
        .when(is_retryable)
        .await
    })
    .await;

    let response = match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => return Error::UpstreamRequest(e).into_response(),
        Err(_) => return Error::Timeout.into_response(),
    };

    if stream {
        handle_stream_response(state, response, start_time, analytics_ctx).await
    } else {
        handle_non_stream_response(state, response, start_time, analytics_ctx).await
    }
}
