use std::sync::Arc;
use std::time::Instant;

use axum::{
    Json, Router,
    body::Body,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use bytes::Bytes;
use futures_util::StreamExt;
use reqwest::Client;

use crate::analytics::{AnalyticsReporter, GenerationEvent, fetch_generation_metadata};
use crate::config::LlmProxyConfig;
use crate::types::{
    ChatCompletionRequest, OPENROUTER_URL, OpenRouterRequest, OpenRouterResponse, Provider,
    ToolChoice, UsageInfo,
};

enum ProxyError {
    UpstreamRequest(reqwest::Error),
    Timeout,
    BodyRead(reqwest::Error),
}

impl IntoResponse for ProxyError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::UpstreamRequest(e) => {
                tracing::error!(error = %e, "upstream request failed");
                (StatusCode::BAD_GATEWAY, e.to_string())
            }
            Self::Timeout => {
                tracing::error!("upstream request timeout");
                (StatusCode::GATEWAY_TIMEOUT, "Request timeout".to_string())
            }
            Self::BodyRead(e) => {
                tracing::error!(error = %e, "failed to read response body");
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
struct AppState {
    config: LlmProxyConfig,
    client: Client,
}

pub fn router(config: LlmProxyConfig) -> Router {
    let state = AppState {
        config,
        client: Client::new(),
    };

    Router::new()
        .route("/completions", post(completions_handler))
        .with_state(state)
}

async fn report_with_cost(
    analytics: &dyn AnalyticsReporter,
    client: &Client,
    api_key: &str,
    mut event: GenerationEvent,
) {
    event.total_cost = fetch_generation_metadata(client, api_key, &event.generation_id).await;
    analytics.report_generation(event).await;
}

fn spawn_analytics_report(
    analytics: Option<Arc<dyn AnalyticsReporter>>,
    client: Client,
    api_key: String,
    event: GenerationEvent,
) {
    if let Some(analytics) = analytics {
        tokio::spawn(async move {
            report_with_cost(&*analytics, &client, &api_key, event).await;
        });
    }
}

struct StreamAccumulator {
    generation_id: Option<String>,
    model: Option<String>,
    input_tokens: u32,
    output_tokens: u32,
}

impl StreamAccumulator {
    fn new() -> Self {
        Self {
            generation_id: None,
            model: None,
            input_tokens: 0,
            output_tokens: 0,
        }
    }

    fn process_chunk(&mut self, chunk: &[u8]) {
        let Ok(text) = std::str::from_utf8(chunk) else {
            return;
        };

        for line in text.lines() {
            let Some(data) = line.strip_prefix("data: ") else {
                continue;
            };

            if data.trim() == "[DONE]" {
                continue;
            }

            let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) else {
                continue;
            };

            if self.generation_id.is_none() {
                self.generation_id = parsed.get("id").and_then(|v| v.as_str()).map(String::from);
            }

            if self.model.is_none() {
                self.model = parsed
                    .get("model")
                    .and_then(|v| v.as_str())
                    .map(String::from);
            }

            if let Some(usage) = parsed
                .get("usage")
                .and_then(|u| serde_json::from_value::<UsageInfo>(u.clone()).ok())
            {
                self.input_tokens = usage.input_tokens();
                self.output_tokens = usage.output_tokens();
            }
        }
    }

    fn into_event(self, start_time: Instant, http_status: u16) -> Option<GenerationEvent> {
        Some(GenerationEvent {
            generation_id: self.generation_id?,
            model: self.model.unwrap_or_default(),
            input_tokens: self.input_tokens,
            output_tokens: self.output_tokens,
            latency: start_time.elapsed().as_secs_f64(),
            http_status,
            total_cost: None,
        })
    }
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

    let openrouter_request = OpenRouterRequest {
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.tool_choice,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream,
        models,
        provider: Provider::default(),
        extra: request.extra,
    };

    let result = tokio::time::timeout(state.config.timeout, async {
        state
            .client
            .post(OPENROUTER_URL)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", state.config.api_key))
            .json(&openrouter_request)
            .send()
            .await
    })
    .await;

    let response = match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => return ProxyError::UpstreamRequest(e).into_response(),
        Err(_) => return ProxyError::Timeout.into_response(),
    };

    let status = response.status();
    let http_status = status.as_u16();

    if stream {
        handle_stream_response(state, response, start_time, http_status).await
    } else {
        handle_non_stream_response(state, response, start_time, http_status).await
    }
}

async fn handle_stream_response(
    state: AppState,
    response: reqwest::Response,
    start_time: Instant,
    http_status: u16,
) -> Response {
    let status = response.status();
    let analytics: Option<Arc<dyn AnalyticsReporter>> = state.config.analytics.clone();
    let api_key = state.config.api_key.clone();
    let client = state.client.clone();

    let stream = response.bytes_stream();
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, std::io::Error>>(32);

    tokio::spawn(async move {
        let mut accumulator = StreamAccumulator::new();

        futures_util::pin_mut!(stream);

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    if analytics.is_some() {
                        accumulator.process_chunk(&chunk);
                    }

                    if tx.send(Ok(chunk)).await.is_err() {
                        break;
                    }
                }
                Err(e) => {
                    let _ = tx
                        .send(Err(std::io::Error::new(std::io::ErrorKind::Other, e)))
                        .await;
                    break;
                }
            }
        }

        if let Some(analytics) = analytics {
            if let Some(event) = accumulator.into_event(start_time, http_status) {
                report_with_cost(&*analytics, &client, &api_key, event).await;
            }
        }
    });

    let body = Body::from_stream(tokio_stream::wrappers::ReceiverStream::new(rx));
    Response::builder()
        .status(status)
        .header("Content-Type", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .body(body)
        .unwrap()
}

async fn handle_non_stream_response(
    state: AppState,
    response: reqwest::Response,
    start_time: Instant,
    http_status: u16,
) -> Response {
    let status = response.status();

    let body_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => return ProxyError::BodyRead(e).into_response(),
    };

    if let Ok(parsed) = serde_json::from_slice::<OpenRouterResponse>(&body_bytes) {
        let event = GenerationEvent {
            generation_id: parsed.id,
            model: parsed.model.unwrap_or_default(),
            input_tokens: parsed.usage.as_ref().map(|u| u.input_tokens()).unwrap_or(0),
            output_tokens: parsed
                .usage
                .as_ref()
                .map(|u| u.output_tokens())
                .unwrap_or(0),
            latency: start_time.elapsed().as_secs_f64(),
            http_status,
            total_cost: None,
        };

        spawn_analytics_report(
            state.config.analytics.clone(),
            state.client.clone(),
            state.config.api_key.clone(),
            event,
        );
    }

    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .body(Body::from(body_bytes))
        .unwrap()
}
