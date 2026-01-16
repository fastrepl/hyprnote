use std::time::Duration;

use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use reqwest::Client;
use serde::Serialize;

use crate::env::env;

const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(30);
const HEALTH_CHECK_MODEL: &str = "openai/gpt-4.1-nano";

#[derive(Clone)]
pub struct HealthState {
    client: Client,
}

impl HealthState {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(HEALTH_CHECK_TIMEOUT)
                .build()
                .expect("failed to create health check client"),
        }
    }
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    latency_ms: Option<u64>,
}

pub fn router() -> Router {
    let state = HealthState::new();

    Router::new()
        .route("/llm", get(llm_health_check))
        .route("/stt", get(stt_health_check))
        .with_state(state)
}

async fn llm_health_check(State(state): State<HealthState>) -> Response {
    let start = std::time::Instant::now();

    let request_body = serde_json::json!({
        "model": HEALTH_CHECK_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "Reply with exactly: ok"
            }
        ],
        "max_tokens": 5,
        "temperature": 0.0
    });

    let result = state
        .client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header(
            "Authorization",
            format!("Bearer {}", env().openrouter_api_key),
        )
        .json(&request_body)
        .send()
        .await;

    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(response) => {
            let status_code = response.status();

            if status_code.is_success() {
                (
                    StatusCode::OK,
                    Json(HealthResponse {
                        status: "ok",
                        error: None,
                        latency_ms: Some(latency_ms),
                    }),
                )
                    .into_response()
            } else {
                let error_body = response.text().await.unwrap_or_default();
                let error_msg =
                    format!("upstream returned {}: {}", status_code.as_u16(), error_body);

                tracing::warn!(
                    upstream_status = %status_code.as_u16(),
                    latency_ms = %latency_ms,
                    error = %error_msg,
                    "llm_health_check_failed"
                );

                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(HealthResponse {
                        status: "error",
                        error: Some(error_msg),
                        latency_ms: Some(latency_ms),
                    }),
                )
                    .into_response()
            }
        }
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "request timeout".to_string()
            } else if e.is_connect() {
                "connection failed".to_string()
            } else {
                e.to_string()
            };

            tracing::warn!(
                latency_ms = %latency_ms,
                error = %error_msg,
                "llm_health_check_failed"
            );

            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthResponse {
                    status: "error",
                    error: Some(error_msg),
                    latency_ms: Some(latency_ms),
                }),
            )
                .into_response()
        }
    }
}

async fn stt_health_check(State(state): State<HealthState>) -> Response {
    let start = std::time::Instant::now();

    let configured_providers = env().configured_providers();

    if configured_providers.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(HealthResponse {
                status: "error",
                error: Some("no STT providers configured".to_string()),
                latency_ms: None,
            }),
        )
            .into_response();
    }

    let provider = configured_providers.first().unwrap();
    let api_key = env().api_keys().get(provider).cloned();

    let Some(api_key) = api_key else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(HealthResponse {
                status: "error",
                error: Some(format!("no API key for provider {:?}", provider)),
                latency_ms: None,
            }),
        )
            .into_response();
    };

    let health_url = match provider {
        owhisper_providers::Provider::Deepgram => "https://api.deepgram.com/v1/projects",
        owhisper_providers::Provider::AssemblyAI => {
            "https://api.assemblyai.com/v2/transcript?limit=1"
        }
        _ => {
            let latency_ms = start.elapsed().as_millis() as u64;
            return (
                StatusCode::OK,
                Json(HealthResponse {
                    status: "ok",
                    error: None,
                    latency_ms: Some(latency_ms),
                }),
            )
                .into_response();
        }
    };

    let auth_header = match provider {
        owhisper_providers::Provider::Deepgram => format!("Token {}", api_key),
        owhisper_providers::Provider::AssemblyAI => api_key,
        _ => format!("Bearer {}", api_key),
    };

    let result = state
        .client
        .get(health_url)
        .header("Authorization", auth_header)
        .send()
        .await;

    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(response) => {
            let status_code = response.status();

            if status_code.is_success() || status_code == StatusCode::UNAUTHORIZED {
                (
                    StatusCode::OK,
                    Json(HealthResponse {
                        status: "ok",
                        error: None,
                        latency_ms: Some(latency_ms),
                    }),
                )
                    .into_response()
            } else {
                let error_body = response.text().await.unwrap_or_default();
                let error_msg = format!(
                    "{:?} returned {}: {}",
                    provider,
                    status_code.as_u16(),
                    error_body
                );

                tracing::warn!(
                    provider = ?provider,
                    upstream_status = %status_code.as_u16(),
                    latency_ms = %latency_ms,
                    error = %error_msg,
                    "stt_health_check_failed"
                );

                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(HealthResponse {
                        status: "error",
                        error: Some(error_msg),
                        latency_ms: Some(latency_ms),
                    }),
                )
                    .into_response()
            }
        }
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "request timeout".to_string()
            } else if e.is_connect() {
                "connection failed".to_string()
            } else {
                e.to_string()
            };

            tracing::warn!(
                provider = ?provider,
                latency_ms = %latency_ms,
                error = %error_msg,
                "stt_health_check_failed"
            );

            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthResponse {
                    status: "error",
                    error: Some(error_msg),
                    latency_ms: Some(latency_ms),
                }),
            )
                .into_response()
        }
    }
}
