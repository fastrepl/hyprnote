use axum::{
    extract::{Json, State},
    http::StatusCode,
};

use crate::state::AppState;

pub async fn handler(
    State(_state): State<AppState>,
    Json(_input): Json<hypr_nango::NangoConnectWebhook>,
) -> Result<StatusCode, StatusCode> {
    Ok(StatusCode::OK)
}
