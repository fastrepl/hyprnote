// https://getlago.com/docs/api-reference/webhooks/messages

use axum::{extract::State, http::StatusCode, response::IntoResponse};

use crate::state::AppState;

pub async fn handler(State(_state): State<AppState>) -> impl IntoResponse {
    StatusCode::OK
}
