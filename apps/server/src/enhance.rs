use axum::{
    body::Body,
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use http::StatusCode;

use crate::state::AppState;
use hypr_bridge::EnhanceInput;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<EnhanceInput>,
) -> Result<impl IntoResponse, StatusCode> {
    let api_key = state.secrets.get("OPENAI_API_KEY").unwrap();

    let response = state
        .reqwest
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "text/event-stream")
        .json(&input)
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stream = response.bytes_stream();

    let response = Response::builder()
        .header("Content-Type", "text/event-stream")
        .body(Body::from_stream(stream))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(response)
}
