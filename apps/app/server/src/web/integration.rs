use axum::{extract::State, http::StatusCode, Json};
use hypr_nango::{NangoConnectSessionRequest, NangoConnectSessionResponse};

use crate::state::AppState;

pub type CreateSessionInput = NangoConnectSessionRequest;
pub type CreateSessionOutput = NangoConnectSessionResponse;

pub async fn create_connection(
    State(state): State<AppState>,
    Json(input): Json<CreateSessionInput>,
) -> Result<Json<CreateSessionOutput>, StatusCode> {
    let res = state
        .nango
        .create_connect_session(input)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res))
}
