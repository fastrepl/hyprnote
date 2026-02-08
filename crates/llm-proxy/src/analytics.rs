//! Analytics tracking for LLM generations

use hypr_analytics::{AnalyticsClient, AnalyticsPayload};

/// Event representing a completed LLM generation
#[derive(Debug, Clone)]
pub struct GenerationEvent {
    /// Device fingerprint for anonymous tracking
    pub fingerprint: Option<String>,
    /// Authenticated user ID
    pub user_id: Option<String>,
    /// Unique ID for this generation from the provider
    pub generation_id: String,
    /// Model used for the generation
    pub model: String,
    /// Number of input tokens
    pub input_tokens: u32,
    /// Number of output tokens
    pub output_tokens: u32,
    /// Total latency in seconds
    pub latency: f64,
    /// HTTP status code of the response
    pub http_status: u16,
    /// Total cost in USD (if available)
    pub total_cost: Option<f64>,
    /// Name of the provider
    pub provider_name: String,
    /// Base URL of the provider
    pub base_url: String,
}

/// Trait for reporting analytics events
pub trait AnalyticsReporter: Send + Sync {
    /// Report a generation event
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
                .with("$ai_provider", event.provider_name.clone())
                .with("$ai_model", event.model.clone())
                .with("$ai_input_tokens", event.input_tokens)
                .with("$ai_output_tokens", event.output_tokens)
                .with("$ai_latency", event.latency)
                .with("$ai_trace_id", event.generation_id.clone())
                .with("$ai_http_status", event.http_status)
                .with("$ai_base_url", event.base_url.clone());

            let payload = if let Some(cost) = event.total_cost {
                payload.with("$ai_total_cost_usd", cost)
            } else {
                payload
            };

            let payload = if let Some(user_id) = &event.user_id {
                payload.with("user_id", user_id.clone())
            } else {
                payload
            };

            let distinct_id = event.fingerprint.unwrap_or_else(|| {
                tracing::warn!(
                    generation_id = %event.generation_id,
                    "device_fingerprint missing, falling back to generation_id for distinct_id"
                );
                event.generation_id.clone()
            });
            let _ = self.event(distinct_id, payload.build()).await;
        })
    }
}
