use std::time::Duration;

use axum::{
    Json, Router,
    body::Body,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
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

async fn completions_handler(
    State(state): State<AppState>,
    Json(request): Json<ChatCompletionRequest>,
) -> Response {
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

    if stream {
        let body = Body::from_stream(response.bytes_stream());
        Response::builder()
            .status(status)
            .header("Content-Type", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .body(body)
            .unwrap()
    } else {
        let body = Body::from_stream(response.bytes_stream());
        Response::builder()
            .status(status)
            .header("Content-Type", "application/json")
            .body(body)
            .unwrap()
    }
}
