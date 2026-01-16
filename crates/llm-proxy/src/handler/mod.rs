mod non_streaming;
mod streaming;

use non_streaming::*;
use streaming::*;

use std::sync::Arc;
use std::time::Instant;

use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use reqwest::Client;

use crate::analytics::{AnalyticsReporter, GenerationEvent};
use crate::config::LlmProxyConfig;
use crate::types::{ChatCompletionRequest, ToolChoice};

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

enum ProxyError {
    UpstreamRequest(reqwest::Error),
    Timeout,
    BodyRead(reqwest::Error),
}

impl IntoResponse for ProxyError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::UpstreamRequest(e) => {
                let status_code = e.status().map(|s| s.as_u16());
                let is_timeout = e.is_timeout();
                let is_connect = e.is_connect();
                tracing::error!(
                    error = %e,
                    upstream_status = ?status_code,
                    is_timeout = %is_timeout,
                    is_connect = %is_connect,
                    "upstream_request_failed"
                );
                (StatusCode::BAD_GATEWAY, e.to_string())
            }
            Self::Timeout => {
                tracing::error!("upstream_request_timeout");
                (StatusCode::GATEWAY_TIMEOUT, "Request timeout".to_string())
            }
            Self::BodyRead(e) => {
                let is_timeout = e.is_timeout();
                let is_decode = e.is_decode();
                tracing::error!(
                    error = %e,
                    is_timeout = %is_timeout,
                    is_decode = %is_decode,
                    "response_body_read_failed"
                );
                (
                    StatusCode::BAD_GATEWAY,
                    "Failed to read response".to_string(),
                )
            }
        };
        (status, message).into_response()
    }
}

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: LlmProxyConfig,
    pub(crate) client: Client,
}

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

pub fn chat_completions_router(config: LlmProxyConfig) -> Router {
    let state = AppState {
        config,
        client: Client::new(),
    };

    Router::new()
        .route("/chat/completions", post(completions_handler))
        .with_state(state)
}

async fn completions_handler(
    State(state): State<AppState>,
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

    let provider_request = match provider.build_request(&request, models, stream) {
        Ok(req) => req,
        Err(e) => {
            tracing::error!(error = %e, "failed_to_build_provider_request");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid request").into_response();
        }
    };

    let result = tokio::time::timeout(state.config.timeout, async {
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
    .await;

    let response = match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => return ProxyError::UpstreamRequest(e).into_response(),
        Err(_) => return ProxyError::Timeout.into_response(),
    };

    if stream {
        handle_stream_response(state, response, start_time).await
    } else {
        handle_non_stream_response(state, response, start_time).await
    }
}
