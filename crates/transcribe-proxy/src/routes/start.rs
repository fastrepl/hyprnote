use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use hypr_api_auth::AuthContext;
use serde::{Deserialize, Serialize};

use super::AppState;

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StartRequest {
    pub file_id: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct StartResponse {
    pub id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestateRunRequest {
    user_id: String,
    file_id: String,
}

#[utoipa::path(
    post,
    path = "/stt/start",
    request_body = StartRequest,
    responses(
        (status = 200, description = "Pipeline started", body = StartResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Restate service unavailable"),
    ),
    tag = "stt",
)]
pub async fn handler(
    State(state): State<AppState>,
    auth: Option<axum::Extension<AuthContext>>,
    Json(body): Json<StartRequest>,
) -> Result<Json<StartResponse>, Response> {
    let auth =
        auth.ok_or_else(|| (StatusCode::UNAUTHORIZED, "authentication required").into_response())?;

    let user_id = auth.claims.sub.clone();

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

    let workflow_key = uuid::Uuid::new_v4().to_string();
    let encoded_key = urlencoding::encode(&workflow_key);
    let url = format!("{ingress_url}/SttFile/{encoded_key}/run/send");

    let resp = state
        .client
        .post(&url)
        .json(&RestateRunRequest {
            user_id,
            file_id: body.file_id,
        })
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::BAD_GATEWAY,
                format!("restate request failed: {e}"),
            )
                .into_response()
        })?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let resp_body = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("restate returned {status}: {resp_body}"),
        )
            .into_response());
    }

    Ok(Json(StartResponse { id: workflow_key }))
}
