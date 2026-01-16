use std::time::Instant;

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use chrono::Utc;
use serde::Serialize;

use hypr_llm_proxy::LlmProxyConfig;
use hypr_llm_proxy::health::HealthSnapshot as LlmHealthSnapshot;
use hypr_transcribe_proxy::SttProxyConfig;
use hypr_transcribe_proxy::health::HealthSnapshot as SttHealthSnapshot;

use super::policy::{HealthStatus, ReadinessPolicy};

#[derive(Serialize)]
struct IetfHealthResponse {
    status: HealthStatus,
    version: String,
    #[serde(rename = "releaseId")]
    release_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "serviceId")]
    service_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    checks: serde_json::Map<String, serde_json::Value>,
}

#[derive(Clone)]
pub struct HealthRouterState {
    pub llm_config: LlmProxyConfig,
    pub stt_config: SttProxyConfig,
    pub process_start: Instant,
}

pub fn health_router(llm_config: LlmProxyConfig, stt_config: SttProxyConfig) -> Router {
    let state = HealthRouterState {
        llm_config,
        stt_config,
        process_start: Instant::now(),
    };

    Router::new()
        .route("/", get(healthz))
        .route("/livez", get(livez))
        .route("/readyz", get(readyz))
        .with_state(state)
}

async fn livez() -> &'static str {
    "ok"
}

async fn readyz(State(state): State<HealthRouterState>) -> (StatusCode, Json<IetfHealthResponse>) {
    let llm_snapshot = state.llm_config.health.snapshot();
    let stt_snapshot = state.stt_config.health.snapshot();

    let llm_readiness = ReadinessPolicy::evaluate_llm(&llm_snapshot);
    let stt_readiness = ReadinessPolicy::evaluate_stt(&stt_snapshot);

    let overall_status = ReadinessPolicy::combine(&[llm_readiness.clone(), stt_readiness.clone()]);

    let http_status = match overall_status {
        HealthStatus::Pass | HealthStatus::Warn => StatusCode::OK,
        HealthStatus::Fail => StatusCode::SERVICE_UNAVAILABLE,
    };

    let response = build_response(
        llm_snapshot,
        stt_snapshot,
        state.process_start.elapsed(),
        overall_status,
        false,
    );

    (http_status, Json(response))
}

async fn healthz(State(state): State<HealthRouterState>) -> Json<IetfHealthResponse> {
    let llm_snapshot = state.llm_config.health.snapshot();
    let stt_snapshot = state.stt_config.health.snapshot();

    let llm_readiness = ReadinessPolicy::evaluate_llm(&llm_snapshot);
    let stt_readiness = ReadinessPolicy::evaluate_stt(&stt_snapshot);

    let overall_status = ReadinessPolicy::combine(&[llm_readiness, stt_readiness]);

    let response = build_response(
        llm_snapshot,
        stt_snapshot,
        state.process_start.elapsed(),
        overall_status,
        true,
    );

    Json(response)
}

fn build_response(
    llm_snapshot: LlmHealthSnapshot,
    stt_snapshot: SttHealthSnapshot,
    uptime: std::time::Duration,
    overall_status: HealthStatus,
    include_details: bool,
) -> IetfHealthResponse {
    let release_id = option_env!("APP_VERSION")
        .map(String::from)
        .unwrap_or_else(|| "unknown".to_string());
    let now = Utc::now().to_rfc3339();

    let mut checks = serde_json::Map::new();

    checks.insert(
        "uptime".to_string(),
        serde_json::json!([{
            "componentType": "system",
            "observedValue": uptime.as_secs(),
            "observedUnit": "s",
            "status": "pass",
            "time": now,
        }]),
    );

    let llm_readiness = ReadinessPolicy::evaluate_llm(&llm_snapshot);
    let llm_output = if include_details {
        Some(format_llm_output(&llm_snapshot))
    } else {
        llm_readiness.message.clone()
    };

    checks.insert(
        "llm:proxy".to_string(),
        serde_json::json!([{
            "componentId": "llm-proxy",
            "componentType": "component",
            "observedValue": llm_snapshot.error_rate,
            "observedUnit": "error_rate",
            "status": llm_readiness.status,
            "time": now,
            "output": llm_output,
        }]),
    );

    let stt_readiness = ReadinessPolicy::evaluate_stt(&stt_snapshot);
    let stt_output = if include_details {
        Some(format_stt_output(&stt_snapshot))
    } else {
        stt_readiness.message.clone()
    };

    checks.insert(
        "stt:proxy".to_string(),
        serde_json::json!([{
            "componentId": "stt-proxy",
            "componentType": "component",
            "observedValue": stt_snapshot.error_rate,
            "observedUnit": "error_rate",
            "status": stt_readiness.status,
            "time": now,
            "output": stt_output,
        }]),
    );

    IetfHealthResponse {
        status: overall_status,
        version: "1".to_string(),
        release_id,
        service_id: Some("hyprnote-ai-server".to_string()),
        description: Some("Hyprnote AI Proxy Server".to_string()),
        checks,
    }
}

fn format_llm_output(snapshot: &LlmHealthSnapshot) -> String {
    let mut parts = Vec::new();

    if let Some(duration) = snapshot.time_since_success() {
        parts.push(format!("Last success: {}s ago", duration.as_secs()));
    } else {
        parts.push("No successful requests yet".to_string());
    }

    if let Some(ref error) = snapshot.last_error {
        let age = error.timestamp.elapsed().as_secs();
        parts.push(format!(
            "Last error: {}s ago ({})",
            age,
            error.error_type.display()
        ));
    }

    parts.join(", ")
}

fn format_stt_output(snapshot: &SttHealthSnapshot) -> String {
    let mut parts = Vec::new();

    if let Some(duration) = snapshot.time_since_success() {
        parts.push(format!("Last success: {}s ago", duration.as_secs()));
    } else {
        parts.push("No successful requests yet".to_string());
    }

    if let Some(ref error) = snapshot.last_error {
        let age = error.timestamp.elapsed().as_secs();
        parts.push(format!(
            "Last error: {}s ago ({})",
            age,
            error.error_type.display()
        ));
    }

    parts.join(", ")
}
