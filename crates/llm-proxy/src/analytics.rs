use hypr_analytics::{AnalyticsClient, AnalyticsPayload};
use reqwest::Client;
use serde::Deserialize;

use crate::types::OPENROUTER_URL;

#[derive(Debug, Clone)]
pub struct GenerationEvent {
    pub generation_id: String,
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub latency: f64,
    pub http_status: u16,
    pub total_cost: Option<f64>,
}

pub trait AnalyticsReporter: Send + Sync {
    fn report_generation(
        &self,
        event: GenerationEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>>;
}

impl AnalyticsReporter for AnalyticsClient {
    fn report_generation(
        &self,
        event: GenerationEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>> {
        Box::pin(async move {
            let payload = AnalyticsPayload::builder("$ai_generation")
                .with("$ai_provider", "openrouter")
                .with("$ai_model", event.model.clone())
                .with("$ai_input_tokens", event.input_tokens)
                .with("$ai_output_tokens", event.output_tokens)
                .with("$ai_latency", event.latency)
                .with("$ai_trace_id", event.generation_id.clone())
                .with("$ai_http_status", event.http_status)
                .with("$ai_base_url", OPENROUTER_URL);

            let payload = if let Some(cost) = event.total_cost {
                payload.with("$ai_total_cost_usd", cost)
            } else {
                payload
            };

            let _ = self.event(event.generation_id, payload.build()).await;
        })
    }
}

pub async fn fetch_generation_metadata(
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
