use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use chrono::Utc;
use serde::Serialize;

use super::policy::{HealthStatus, ReadinessPolicy};
use super::state::{ComponentHealth, HealthSnapshot, HealthState};

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

pub fn health_router(state: Arc<HealthState>) -> Router {
    Router::new()
        .route("/", get(healthz))
        .route("/livez", get(livez))
        .route("/readyz", get(readyz))
        .with_state(state)
}

async fn livez() -> &'static str {
    "ok"
}

async fn readyz(State(state): State<Arc<HealthState>>) -> (StatusCode, Json<IetfHealthResponse>) {
    let snapshot = state.get_snapshot();

    let llm_readiness = ReadinessPolicy::evaluate(&snapshot.llm);
    let stt_readiness = ReadinessPolicy::evaluate(&snapshot.stt);

    let overall_status = ReadinessPolicy::combine(&[llm_readiness.clone(), stt_readiness.clone()]);

    let http_status = match overall_status {
        HealthStatus::Pass | HealthStatus::Warn => StatusCode::OK,
        HealthStatus::Fail => StatusCode::SERVICE_UNAVAILABLE,
    };

    let response = build_response(snapshot, overall_status, false);

    (http_status, Json(response))
}

async fn healthz(State(state): State<Arc<HealthState>>) -> Json<IetfHealthResponse> {
    let snapshot = state.get_snapshot();

    let llm_readiness = ReadinessPolicy::evaluate(&snapshot.llm);
    let stt_readiness = ReadinessPolicy::evaluate(&snapshot.stt);

    let overall_status = ReadinessPolicy::combine(&[llm_readiness, stt_readiness]);

    let response = build_response(snapshot, overall_status, true);

    Json(response)
}

fn build_response(
    snapshot: HealthSnapshot,
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
            "observedValue": snapshot.uptime.as_secs(),
            "observedUnit": "s",
            "status": "pass",
            "time": now,
        }]),
    );

    let llm_readiness = ReadinessPolicy::evaluate(&snapshot.llm);
    let llm_output = if include_details {
        Some(format_component_output(&snapshot.llm))
    } else {
        llm_readiness.message.clone()
    };

    checks.insert(
        "llm:proxy".to_string(),
        serde_json::json!([{
            "componentId": "llm-proxy",
            "componentType": "component",
            "observedValue": snapshot.llm.error_rate(),
            "observedUnit": "error_rate",
            "status": llm_readiness.status,
            "time": now,
            "output": llm_output,
        }]),
    );

    let stt_readiness = ReadinessPolicy::evaluate(&snapshot.stt);
    let stt_output = if include_details {
        Some(format_component_output(&snapshot.stt))
    } else {
        stt_readiness.message.clone()
    };

    checks.insert(
        "stt:proxy".to_string(),
        serde_json::json!([{
            "componentId": "stt-proxy",
            "componentType": "component",
            "observedValue": snapshot.stt.error_rate(),
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

fn format_component_output(component: &ComponentHealth) -> String {
    let mut parts = Vec::new();

    if let Some(duration) = component.time_since_success() {
        parts.push(format!("Last success: {}s ago", duration.as_secs()));
    } else {
        parts.push("No successful requests yet".to_string());
    }

    if let Some(ref error) = component.last_error {
        let age = error.timestamp.elapsed().as_secs();
        parts.push(format!(
            "Last error: {}s ago ({})",
            age,
            error.error_type.display()
        ));
    }

    parts.join(", ")
}
