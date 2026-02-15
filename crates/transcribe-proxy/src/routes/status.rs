use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use hypr_restate_stt_types::SttStatusResponse;

use super::AppState;

#[utoipa::path(
    get,
    path = "/stt/status/{pipeline_id}",
    params(
        ("pipeline_id" = String, Path, description = "Pipeline ID (Restate workflow key)")
    ),
    responses(
        (status = 200, description = "Pipeline status", body = SttStatusResponse),
        (status = 502, description = "Restate service unavailable"),
    ),
    tag = "stt",
)]
pub async fn handler(
    State(state): State<AppState>,
    Path(pipeline_id): Path<String>,
) -> Result<Json<SttStatusResponse>, Response> {
    let ingress_url = state
        .config
        .restate_ingress_url
        .as_deref()
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "restate_ingress_url not configured",
            )
                .into_response()
        })?
        .trim_end_matches('/');

    let encoded_id = urlencoding::encode(&pipeline_id);
    let url = format!("{ingress_url}/SttFile/{encoded_id}/getStatus");

    let resp = state.client.get(&url).send().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            format!("restate request failed: {e}"),
        )
            .into_response()
    })?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("restate returned {status}: {body}"),
        )
            .into_response());
    }

    let status_response: SttStatusResponse = resp.json().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            format!("invalid response from restate: {e}"),
        )
            .into_response()
    })?;

    Ok(Json(status_response))
}
