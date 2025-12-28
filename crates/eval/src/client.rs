use std::time::Duration;

use backon::{BlockingRetryable, ExponentialBuilder};
use serde::{Deserialize, Serialize};
use ureq::Agent;

use crate::cache::CachingClient;
use crate::constants::{DEFAULT_RETRY_INTERVAL_MS, DEFAULT_TEMPERATURE, OPENROUTER_BASE_URL};

/// Errors that can occur when interacting with the LLM API.
#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    #[error("HTTP error: {0}")]
    Http(#[from] ureq::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("No choices in response from model")]
    NoChoices,
    #[error("Unexpected status code: {0}")]
    UnexpectedStatus(u16),
    #[error("Request to model '{model}' failed: {message}")]
    ModelError { model: String, message: String },
    #[error("Grader error for rubric '{rubric}': {message}")]
    GraderError { rubric: String, message: String },
}

impl ClientError {
    /// Creates a new model error with context.
    pub fn model_error(model: impl Into<String>, message: impl Into<String>) -> Self {
        ClientError::ModelError {
            model: model.into(),
            message: message.into(),
        }
    }

    /// Creates a new grader error with context.
    pub fn grader_error(rubric: impl Into<String>, message: impl Into<String>) -> Self {
        ClientError::GraderError {
            rubric: rubric.into(),
            message: message.into(),
        }
    }

    /// Returns true if this error is retryable.
    pub fn is_retryable(&self) -> bool {
        match self {
            ClientError::Http(ureq::Error::StatusCode(code)) => {
                matches!(*code, 429 | 500 | 502 | 503 | 504)
            }
            ClientError::Http(ureq::Error::Io(_)) => true,
            _ => false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub cost: f64,
}

impl Default for Usage {
    fn default() -> Self {
        Self {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            cost: 0.0,
        }
    }
}

impl Usage {
    pub fn add(&mut self, other: &Usage) {
        self.prompt_tokens += other.prompt_tokens;
        self.completion_tokens += other.completion_tokens;
        self.total_tokens += other.total_tokens;
        self.cost += other.cost;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<ResponseFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseFormat {
    #[serde(rename = "type")]
    pub format_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub json_schema: Option<JsonSchemaFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonSchemaFormat {
    pub name: String,
    pub schema: serde_json::Value,
    pub strict: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub choices: Vec<ChatChoice>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatChoice {
    pub message: ChatChoiceMessage,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatChoiceMessage {
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GenerationResponse {
    pub data: GenerationData,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GenerationData {
    pub native_tokens_prompt: i64,
    pub native_tokens_completion: i64,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraderResponse {
    pub verdict: String,
    pub reasoning: String,
}

pub fn grader_response_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "verdict": {
                "type": "string",
                "enum": ["PASS", "FAIL"],
                "description": "Whether the output passes or fails the rubric criterion"
            },
            "reasoning": {
                "type": "string",
                "description": "Brief explanation for the verdict"
            }
        },
        "required": ["verdict", "reasoning"],
        "additionalProperties": false
    })
}

pub trait ChatCompleter: Send + Sync {
    fn create_chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, ClientError>;
}

pub trait UsageResolver: Send + Sync {
    fn get_generation_usage(&self, generation_id: &str) -> Result<Usage, ClientError>;
}

pub struct OpenRouterClient {
    api_key: String,
    client: CachingClient,
    agent: Agent,
}

impl OpenRouterClient {
    fn create_agent() -> Agent {
        Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(30)))
            .build()
            .into()
    }

    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: CachingClient::new(None),
            agent: Self::create_agent(),
        }
    }

    pub fn with_cache_dir(api_key: String, cache_dir: Option<String>) -> Self {
        Self {
            api_key,
            client: CachingClient::new(cache_dir),
            agent: Self::create_agent(),
        }
    }

    fn make_request(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, ClientError> {
        let url = format!("{}/chat/completions", OPENROUTER_BASE_URL);
        let body = serde_json::to_string(request)?;

        let response = self.client.post(&url, &self.api_key, &body)?;
        let resp: ChatCompletionResponse = serde_json::from_str(&response)?;

        if resp.choices.is_empty() {
            return Err(ClientError::NoChoices);
        }

        Ok(resp)
    }
}

impl ChatCompleter for OpenRouterClient {
    fn create_chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, ClientError> {
        let retry_strategy = ExponentialBuilder::default()
            .with_min_delay(Duration::from_millis(DEFAULT_RETRY_INTERVAL_MS))
            .with_max_times(5);

        let result = (|| self.make_request(request))
            .retry(retry_strategy)
            .when(|e| e.is_retryable())
            .call();

        result
    }
}

impl UsageResolver for OpenRouterClient {
    fn get_generation_usage(&self, generation_id: &str) -> Result<Usage, ClientError> {
        let url = format!("{}/generation?id={}", OPENROUTER_BASE_URL, generation_id);

        let response = self
            .agent
            .get(&url)
            .header("Authorization", &format!("Bearer {}", self.api_key))
            .call()?;

        let body = response.into_body().read_to_string()?;

        let gen_resp: GenerationResponse = serde_json::from_str(&body)?;

        Ok(Usage {
            prompt_tokens: gen_resp.data.native_tokens_prompt,
            completion_tokens: gen_resp.data.native_tokens_completion,
            total_tokens: gen_resp.data.native_tokens_prompt
                + gen_resp.data.native_tokens_completion,
            cost: gen_resp.data.total_cost,
        })
    }
}

/// Builds a chat completion request with common defaults.
fn build_request(
    model: &str,
    messages: Vec<ChatMessage>,
    n: Option<i32>,
    response_format: Option<ResponseFormat>,
) -> ChatCompletionRequest {
    ChatCompletionRequest {
        model: model.to_string(),
        messages,
        temperature: Some(DEFAULT_TEMPERATURE),
        n,
        response_format,
    }
}

/// Extracts outputs from a chat completion response.
fn extract_outputs(response: &ChatCompletionResponse) -> Vec<String> {
    response
        .choices
        .iter()
        .map(|c| c.message.content.clone())
        .collect()
}

/// Creates a user message from a prompt string.
fn user_message(prompt: &str) -> Vec<ChatMessage> {
    vec![ChatMessage {
        role: "user".to_string(),
        content: prompt.to_string(),
    }]
}

/// Creates the grader response format for structured output.
fn grader_response_format() -> ResponseFormat {
    ResponseFormat {
        format_type: "json_schema".to_string(),
        json_schema: Some(JsonSchemaFormat {
            name: "grader_response".to_string(),
            schema: grader_response_schema(),
            strict: true,
        }),
    }
}

pub fn generate_text_with_generation_id(
    client: &dyn ChatCompleter,
    model: &str,
    prompt: &str,
) -> Result<(String, String), ClientError> {
    let request = build_request(model, user_message(prompt), None, None);
    let response = client.create_chat_completion(&request)?;
    Ok((response.choices[0].message.content.clone(), response.id))
}

pub fn generate_text_multi_with_generation_id(
    client: &dyn ChatCompleter,
    model: &str,
    prompt: &str,
    n: i32,
) -> Result<(Vec<String>, String), ClientError> {
    let request = build_request(model, user_message(prompt), Some(n), None);
    let response = client.create_chat_completion(&request)?;
    Ok((extract_outputs(&response), response.id))
}

pub fn generate_chat_with_generation_id(
    client: &dyn ChatCompleter,
    model: &str,
    messages: &[ChatMessage],
) -> Result<(String, String), ClientError> {
    let request = build_request(model, messages.to_vec(), None, None);
    let response = client.create_chat_completion(&request)?;
    Ok((response.choices[0].message.content.clone(), response.id))
}

pub fn generate_chat_multi_with_generation_id(
    client: &dyn ChatCompleter,
    model: &str,
    messages: &[ChatMessage],
    n: i32,
) -> Result<(Vec<String>, String), ClientError> {
    let request = build_request(model, messages.to_vec(), Some(n), None);
    let response = client.create_chat_completion(&request)?;
    Ok((extract_outputs(&response), response.id))
}

pub fn generate_structured_grader_response(
    client: &dyn ChatCompleter,
    model: &str,
    prompt: &str,
) -> Result<GraderResponse, ClientError> {
    let request = build_request(
        model,
        user_message(prompt),
        None,
        Some(grader_response_format()),
    );
    let response = client.create_chat_completion(&request)?;
    let grader_resp: GraderResponse = serde_json::from_str(&response.choices[0].message.content)?;
    Ok(grader_resp)
}

pub fn generate_structured_grader_response_multi(
    client: &dyn ChatCompleter,
    model: &str,
    prompt: &str,
    n: i32,
) -> Result<Vec<GraderResponse>, ClientError> {
    let request = build_request(
        model,
        user_message(prompt),
        Some(n),
        Some(grader_response_format()),
    );
    let response = client.create_chat_completion(&request)?;
    response
        .choices
        .iter()
        .map(|choice| serde_json::from_str(&choice.message.content).map_err(ClientError::from))
        .collect()
}
