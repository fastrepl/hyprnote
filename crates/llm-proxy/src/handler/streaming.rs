use std::time::Instant;

use async_stream::stream;
use axum::{body::Body, response::Response};
use futures_util::StreamExt;

use crate::analytics::GenerationEvent;
use crate::types::UsageInfo;

use super::{AppState, report_with_cost};

struct StreamAccumulator {
    generation_id: Option<String>,
    model: Option<String>,
    input_tokens: u32,
    output_tokens: u32,
}

impl StreamAccumulator {
    fn new() -> Self {
        Self {
            generation_id: None,
            model: None,
            input_tokens: 0,
            output_tokens: 0,
        }
    }

    fn process_chunk(&mut self, chunk: &[u8]) {
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

            if self.generation_id.is_none() {
                self.generation_id = parsed.get("id").and_then(|v| v.as_str()).map(String::from);
            }

            if self.model.is_none() {
                self.model = parsed
                    .get("model")
                    .and_then(|v| v.as_str())
                    .map(String::from);
            }

            if let Some(usage) = parsed
                .get("usage")
                .and_then(|u| serde_json::from_value::<UsageInfo>(u.clone()).ok())
            {
                self.input_tokens = usage.input_tokens();
                self.output_tokens = usage.output_tokens();
            }
        }
    }

    fn into_event(self, start_time: Instant, http_status: u16) -> Option<GenerationEvent> {
        Some(GenerationEvent {
            generation_id: self.generation_id?,
            model: self.model.unwrap_or_default(),
            input_tokens: self.input_tokens,
            output_tokens: self.output_tokens,
            latency: start_time.elapsed().as_secs_f64(),
            http_status,
            total_cost: None,
        })
    }
}

pub(super) async fn handle_stream_response(
    state: AppState,
    response: reqwest::Response,
    start_time: Instant,
) -> Response {
    let status = response.status();
    let http_status = status.as_u16();
    let latency_ms = start_time.elapsed().as_millis();
    let analytics = state.config.analytics.clone();
    let api_key = state.config.api_key.clone();
    let client = state.client.clone();

    tracing::info!(
        http_status = %http_status,
        streaming = true,
        latency_ms = %latency_ms,
        "llm_completion_stream_started"
    );

    let upstream = response.bytes_stream();

    let output_stream = stream! {
        let mut accumulator = StreamAccumulator::new();

        futures_util::pin_mut!(upstream);

        while let Some(chunk_result) = upstream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    if analytics.is_some() {
                        accumulator.process_chunk(&chunk);
                    }
                    yield Ok::<_, std::io::Error>(chunk);
                }
                Err(e) => {
                    yield Err(std::io::Error::new(std::io::ErrorKind::Other, e));
                    break;
                }
            }
        }

        if let Some(analytics) = analytics {
            if let Some(event) = accumulator.into_event(start_time, http_status) {
                report_with_cost(&*analytics, &client, &api_key, event).await;
            }
        }
    };

    let body = Body::from_stream(output_stream);
    Response::builder()
        .status(status)
        .header("Content-Type", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .body(body)
        .unwrap()
}
