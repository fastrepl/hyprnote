use std::sync::Arc;
use std::time::Instant;

use axum::{
    body::Body,
    response::{IntoResponse, Response},
};
use reqwest::Client;

use crate::analytics::{AnalyticsReporter, GenerationEvent};
use crate::types::OpenRouterResponse;

use super::{AppState, ProxyError, report_with_cost};

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

pub(super) async fn handle_non_stream_response(
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
