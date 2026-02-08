use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::ProviderError;
use crate::types::{ChatCompletionRequest, ChatMessage, ToolChoice, UsageInfo};

use super::{GenerationMetadata, Provider, StreamAccumulator};

pub const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";

pub struct OpenRouterProvider {
    pub base_url: String,
}

impl Default for OpenRouterProvider {
    fn default() -> Self {
        Self {
            base_url: OPENROUTER_URL.to_string(),
        }
    }
}

impl OpenRouterProvider {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
        }
    }
}

#[derive(Serialize)]
struct OpenRouterRequest {
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<ToolChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    pub stream: bool,
    pub models: Vec<String>,
    pub provider: OpenRouterProviderPreference,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize)]
struct OpenRouterProviderPreference {
    sort: &'static str,
}

impl Default for OpenRouterProviderPreference {
    fn default() -> Self {
        Self { sort: "latency" }
    }
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    pub id: String,
    pub model: Option<String>,
    pub usage: Option<UsageInfo>,
}

impl Provider for OpenRouterProvider {
    fn name(&self) -> &str {
        "openrouter"
    }

    fn base_url(&self) -> &str {
        &self.base_url
    }

    fn build_request(
        &self,
        request: &ChatCompletionRequest,
        models: Vec<String>,
        stream: bool,
    ) -> Result<serde_json::Value, ProviderError> {
        let openrouter_request = OpenRouterRequest {
            messages: request.messages.clone(),
            tools: request.tools.clone(),
            tool_choice: request.tool_choice.clone(),
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            stream,
            models,
            provider: OpenRouterProviderPreference::default(),
            extra: request.extra.clone(),
        };

        Ok(serde_json::to_value(openrouter_request)?)
    }

    fn parse_response(&self, body: &[u8]) -> Result<GenerationMetadata, ProviderError> {
        let parsed: OpenRouterResponse =
            serde_json::from_slice(body).map_err(|e| ProviderError::ParseError(e.to_string()))?;

        Ok(GenerationMetadata {
            generation_id: parsed.id,
            model: parsed.model,
            input_tokens: parsed.usage.as_ref().map(|u| u.input_tokens()).unwrap_or(0),
            output_tokens: parsed
                .usage
                .as_ref()
                .map(|u| u.output_tokens())
                .unwrap_or(0),
        })
    }

    fn parse_stream_chunk(&self, chunk: &[u8], accumulator: &mut StreamAccumulator) {
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

            if accumulator.generation_id.is_none() {
                accumulator.generation_id =
                    parsed.get("id").and_then(|v| v.as_str()).map(String::from);
            }

            if accumulator.model.is_none() {
                accumulator.model = parsed
                    .get("model")
                    .and_then(|v| v.as_str())
                    .map(String::from);
            }

            if let Some(usage) = parsed
                .get("usage")
                .and_then(|u| serde_json::from_value::<UsageInfo>(u.clone()).ok())
            {
                accumulator.input_tokens = usage.input_tokens();
                accumulator.output_tokens = usage.output_tokens();
            }
        }
    }

    fn fetch_cost(
        &self,
        client: &Client,
        api_key: &str,
        generation_id: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Option<f64>> + Send + '_>> {
        let client = client.clone();
        let api_key = api_key.to_string();
        let generation_id = generation_id.to_string();

        Box::pin(async move {
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
                    http_status = %response.status().as_u16(),
                    generation_id = %generation_id,
                    "generation_metadata_fetch_failed"
                );
                return None;
            }

            let data: OpenRouterGenerationResponse = response.json().await.ok()?;
            Some(data.data.total_cost)
        })
    }
}
