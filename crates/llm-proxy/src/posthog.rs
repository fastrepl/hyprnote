use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct PostHogConfig {
    pub api_key: String,
    pub host: String,
}

impl PostHogConfig {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            host: "https://us.i.posthog.com".into(),
        }
    }

    pub fn with_host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AiGenerationProperties {
    #[serde(rename = "$ai_provider")]
    pub provider: String,
    #[serde(rename = "$ai_model")]
    pub model: String,
    #[serde(rename = "$ai_input_tokens")]
    pub input_tokens: u32,
    #[serde(rename = "$ai_output_tokens")]
    pub output_tokens: u32,
    #[serde(rename = "$ai_total_cost_usd")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_cost_usd: Option<f64>,
    #[serde(rename = "$ai_latency")]
    pub latency: f64,
    #[serde(rename = "$ai_trace_id")]
    pub trace_id: String,
    #[serde(rename = "$ai_http_status")]
    pub http_status: u16,
    #[serde(rename = "$ai_base_url")]
    pub base_url: String,
}

#[derive(Debug, Serialize)]
struct CaptureEvent {
    event: &'static str,
    distinct_id: String,
    properties: AiGenerationProperties,
}

#[derive(Debug, Serialize)]
struct CaptureRequest {
    api_key: String,
    batch: Vec<CaptureEvent>,
}

pub async fn capture_ai_generation(
    client: &Client,
    config: &PostHogConfig,
    properties: AiGenerationProperties,
) {
    let event = CaptureEvent {
        event: "$ai_generation",
        distinct_id: properties.trace_id.clone(),
        properties,
    };

    let request = CaptureRequest {
        api_key: config.api_key.clone(),
        batch: vec![event],
    };

    let url = format!("{}/batch", config.host);
    if let Err(e) = client.post(&url).json(&request).send().await {
        tracing::warn!(error = %e, "failed to send posthog event");
    }
}

#[derive(Debug, Deserialize)]
pub struct OpenRouterGenerationResponse {
    pub data: OpenRouterGenerationData,
}

#[derive(Debug, Deserialize)]
pub struct OpenRouterGenerationData {
    pub total_cost: f64,
    pub model: String,
    pub provider_name: Option<String>,
    pub latency: Option<f64>,
    pub tokens_prompt: Option<u32>,
    pub tokens_completion: Option<u32>,
}

pub async fn fetch_generation_metadata(
    client: &Client,
    api_key: &str,
    generation_id: &str,
) -> Option<OpenRouterGenerationData> {
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
    Some(data.data)
}
