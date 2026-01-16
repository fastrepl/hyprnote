use std::time::Instant;

use axum::{
    body::Body,
    response::{IntoResponse, Response},
};

use crate::analytics::GenerationEvent;

use super::{AppState, ProxyError, spawn_analytics_report};

pub(super) async fn handle_non_stream_response(
    state: AppState,
    response: reqwest::Response,
    start_time: Instant,
) -> Response {
    let status = response.status();
    let http_status = status.as_u16();
    let latency_ms = start_time.elapsed().as_millis();

    tracing::info!(
        http_status = %http_status,
        streaming = false,
        latency_ms = %latency_ms,
        "llm_completion_response_received"
    );

    let body_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => return ProxyError::BodyRead(e).into_response(),
    };

    if let Ok(metadata) = state.config.provider.parse_response(&body_bytes) {
        let event = GenerationEvent {
            generation_id: metadata.generation_id,
            model: metadata.model.unwrap_or_default(),
            input_tokens: metadata.input_tokens,
            output_tokens: metadata.output_tokens,
            latency: start_time.elapsed().as_secs_f64(),
            http_status,
            total_cost: None,
            provider_name: state.config.provider.name().to_string(),
            base_url: state.config.provider.base_url().to_string(),
        };

        spawn_analytics_report(
            state.config.analytics.clone(),
            state.config.provider.clone(),
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
