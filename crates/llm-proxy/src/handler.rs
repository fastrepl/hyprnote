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

use crate::analytics::fetch_generation_metadata;
use crate::config::LlmProxyConfig;
use crate::types::{
    ChatCompletionRequest, OPENROUTER_URL, OpenRouterRequest, OpenRouterResponse, Provider,
    ToolChoice,
};
use hypr_analytics::{GenerationEvent, GenerationReporter};

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

#[derive(Default)]
struct StreamMetadata {
    generation_id: Option<String>,
    model: Option<String>,
    input_tokens: u32,
    output_tokens: u32,
}

fn extract_stream_metadata(chunk: &[u8], metadata: &mut StreamMetadata) {
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

        if metadata.generation_id.is_none() {
            metadata.generation_id = parsed.get("id").and_then(|v| v.as_str()).map(String::from);
        }

        if metadata.model.is_none() {
            metadata.model = parsed
                .get("model")
                .and_then(|v| v.as_str())
                .map(String::from);
        }

        if let Some(usage) = parsed.get("usage") {
            if let Some(pt) = usage.get("prompt_tokens").and_then(|v| v.as_u64()) {
                metadata.input_tokens = pt as u32;
            }
            if let Some(ct) = usage.get("completion_tokens").and_then(|v| v.as_u64()) {
                metadata.output_tokens = ct as u32;
            }
        }
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
        provider: Provider { sort: "latency" },
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
        Ok(Err(e)) => {
            tracing::error!(error = %e, "upstream request failed");
            return (StatusCode::BAD_GATEWAY, e.to_string()).into_response();
        }
        Err(_) => {
            tracing::error!("upstream request timeout");
            return (StatusCode::GATEWAY_TIMEOUT, "Request timeout").into_response();
        }
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
    let analytics: Option<Arc<dyn GenerationReporter>> = state.config.analytics.clone();
    let api_key = state.config.api_key.clone();
    let client = state.client.clone();

    let stream = response.bytes_stream();
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, std::io::Error>>(32);

    tokio::spawn(async move {
        let mut metadata = StreamMetadata::default();

        futures_util::pin_mut!(stream);

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    if analytics.is_some() {
                        extract_stream_metadata(&chunk, &mut metadata);
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

        let latency = start_time.elapsed().as_secs_f64();

        if let Some(analytics) = analytics {
            if let Some(gen_id) = metadata.generation_id {
                let total_cost = fetch_generation_metadata(&client, &api_key, &gen_id).await;

                let event = GenerationEvent {
                    generation_id: gen_id,
                    model: metadata.model.unwrap_or_default(),
                    input_tokens: metadata.input_tokens,
                    output_tokens: metadata.output_tokens,
                    latency,
                    http_status,
                    total_cost,
                };
                analytics.report_generation(event).await;
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
        Err(e) => {
            tracing::error!(error = %e, "failed to read response body");
            return (StatusCode::BAD_GATEWAY, "Failed to read response").into_response();
        }
    };

    let latency = start_time.elapsed().as_secs_f64();

    if let Some(analytics) = &state.config.analytics {
        if let Ok(parsed) = serde_json::from_slice::<OpenRouterResponse>(&body_bytes) {
            let client = state.client.clone();
            let api_key = state.config.api_key.clone();
            let analytics = analytics.clone();
            let generation_id = parsed.id.clone();

            let input_tokens = parsed
                .usage
                .as_ref()
                .and_then(|u| u.prompt_tokens)
                .unwrap_or(0);
            let output_tokens = parsed
                .usage
                .as_ref()
                .and_then(|u| u.completion_tokens)
                .unwrap_or(0);
            let model = parsed.model.clone().unwrap_or_default();

            tokio::spawn(async move {
                let total_cost = fetch_generation_metadata(&client, &api_key, &generation_id).await;

                let event = GenerationEvent {
                    generation_id,
                    model,
                    input_tokens,
                    output_tokens,
                    latency,
                    http_status,
                    total_cost,
                };
                analytics.report_generation(event).await;
            });
        }
    }

    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .body(Body::from(body_bytes))
        .unwrap()
}
