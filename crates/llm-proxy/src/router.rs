use std::time::{Duration, Instant};

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
use hypr_analytics::{AnalyticsClient, AnalyticsPayload};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const DEFAULT_TIMEOUT_MS: u64 = 120_000;
const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";

#[derive(Clone)]
pub struct LlmProxyConfig {
    pub api_key: String,
    pub timeout: Duration,
    pub models_tool_calling: Vec<String>,
    pub models_default: Vec<String>,
    pub analytics: Option<AnalyticsClient>,
}

impl LlmProxyConfig {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            timeout: Duration::from_millis(DEFAULT_TIMEOUT_MS),
            models_tool_calling: vec![
                "moonshotai/kimi-k2-0905:exacto".into(),
                "anthropic/claude-haiku-4.5".into(),
                "openai/gpt-oss-120b:exacto".into(),
            ],
            models_default: vec![
                "moonshotai/kimi-k2-0905".into(),
                "openai/gpt-5.1-chat".into(),
            ],
            analytics: None,
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_models_tool_calling(mut self, models: Vec<String>) -> Self {
        self.models_tool_calling = models;
        self
    }

    pub fn with_models_default(mut self, models: Vec<String>) -> Self {
        self.models_default = models;
        self
    }

    pub fn with_analytics(mut self, client: AnalyticsClient) -> Self {
        self.analytics = Some(client);
        self
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

#[derive(Debug, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum ToolChoice {
    String(String),
    Object {
        #[serde(rename = "type")]
        type_: String,
        function: serde_json::Value,
    },
}

#[derive(Debug, Deserialize)]
struct ChatCompletionRequest {
    #[serde(default)]
    #[allow(dead_code)]
    model: Option<String>,
    messages: Vec<ChatMessage>,
    #[serde(default)]
    tools: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    tool_choice: Option<ToolChoice>,
    #[serde(default)]
    stream: Option<bool>,
    #[serde(default)]
    temperature: Option<f32>,
    #[serde(default)]
    max_tokens: Option<u32>,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize)]
struct OpenRouterRequest {
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<ToolChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    stream: bool,
    models: Vec<String>,
    provider: Provider,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize)]
struct Provider {
    sort: &'static str,
}

impl Serialize for ToolChoice {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            ToolChoice::String(s) => serializer.serialize_str(s),
            ToolChoice::Object { type_, function } => {
                use serde::ser::SerializeMap;
                let mut map = serializer.serialize_map(Some(2))?;
                map.serialize_entry("type", type_)?;
                map.serialize_entry("function", function)?;
                map.end()
            }
        }
    }
}

impl Serialize for ChatMessage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(Some(2))?;
        map.serialize_entry("role", &self.role)?;
        map.serialize_entry("content", &self.content)?;
        map.end()
    }
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    id: String,
    model: Option<String>,
    usage: Option<UsageInfo>,
}

#[derive(Debug, Deserialize)]
struct UsageInfo {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
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
        let analytics = state.config.analytics.clone();
        let api_key = state.config.api_key.clone();
        let client = state.client.clone();

        let stream = response.bytes_stream();
        let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, std::io::Error>>(32);

        tokio::spawn(async move {
            let mut collected = Vec::new();
            let mut generation_id: Option<String> = None;
            let mut model: Option<String> = None;
            let mut input_tokens = 0u32;
            let mut output_tokens = 0u32;

            futures_util::pin_mut!(stream);

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(chunk) => {
                        collected.extend_from_slice(&chunk);

                        if let Ok(text) = std::str::from_utf8(&chunk) {
                            for line in text.lines() {
                                if let Some(data) = line.strip_prefix("data: ") {
                                    if data.trim() == "[DONE]" {
                                        continue;
                                    }
                                    if let Ok(parsed) =
                                        serde_json::from_str::<serde_json::Value>(data)
                                    {
                                        if generation_id.is_none() {
                                            if let Some(id) =
                                                parsed.get("id").and_then(|v| v.as_str())
                                            {
                                                generation_id = Some(id.to_string());
                                            }
                                        }
                                        if model.is_none() {
                                            if let Some(m) =
                                                parsed.get("model").and_then(|v| v.as_str())
                                            {
                                                model = Some(m.to_string());
                                            }
                                        }
                                        if let Some(usage) = parsed.get("usage") {
                                            if let Some(pt) =
                                                usage.get("prompt_tokens").and_then(|v| v.as_u64())
                                            {
                                                input_tokens = pt as u32;
                                            }
                                            if let Some(ct) = usage
                                                .get("completion_tokens")
                                                .and_then(|v| v.as_u64())
                                            {
                                                output_tokens = ct as u32;
                                            }
                                        }
                                    }
                                }
                            }
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
                if let Some(gen_id) = generation_id {
                    let total_cost = fetch_generation_metadata(&client, &api_key, &gen_id).await;

                    let payload = AnalyticsPayload::builder("$ai_generation")
                        .with("$ai_provider", "openrouter")
                        .with("$ai_model", model.unwrap_or_default())
                        .with("$ai_input_tokens", input_tokens)
                        .with("$ai_output_tokens", output_tokens)
                        .with("$ai_latency", latency)
                        .with("$ai_trace_id", gen_id.clone())
                        .with("$ai_http_status", http_status)
                        .with("$ai_base_url", OPENROUTER_URL);

                    let payload = if let Some(cost) = total_cost {
                        payload.with("$ai_total_cost_usd", cost)
                    } else {
                        payload
                    };

                    let _ = analytics.event(gen_id, payload.build()).await;
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
    } else {
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
                    let total_cost =
                        fetch_generation_metadata(&client, &api_key, &generation_id).await;

                    let payload = AnalyticsPayload::builder("$ai_generation")
                        .with("$ai_provider", "openrouter")
                        .with("$ai_model", model)
                        .with("$ai_input_tokens", input_tokens)
                        .with("$ai_output_tokens", output_tokens)
                        .with("$ai_latency", latency)
                        .with("$ai_trace_id", generation_id.clone())
                        .with("$ai_http_status", http_status)
                        .with("$ai_base_url", OPENROUTER_URL);

                    let payload = if let Some(cost) = total_cost {
                        payload.with("$ai_total_cost_usd", cost)
                    } else {
                        payload
                    };

                    let _ = analytics.event(generation_id, payload.build()).await;
                });
            }
        }

        Response::builder()
            .status(status)
            .header("Content-Type", "application/json")
            .body(Body::from(body_bytes))
            .unwrap()
    }
}

async fn fetch_generation_metadata(
    client: &Client,
    api_key: &str,
    generation_id: &str,
) -> Option<f64> {
    #[derive(Deserialize)]
    struct OpenRouterGenerationResponse {
        data: OpenRouterGenerationData,
    }

    #[derive(Deserialize)]
    struct OpenRouterGenerationData {
        total_cost: f64,
    }

    let url = format!(
        "https://openrouter.ai/api/v1/generation?id={}",
        generation_id
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        tracing::warn!(
            status = %response.status(),
            "failed to fetch generation metadata"
        );
        return None;
    }

    let data: OpenRouterGenerationResponse = response.json().await.ok()?;
    Some(data.data.total_cost)
}
