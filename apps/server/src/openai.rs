use anyhow::Result;
use axum::{
    body::Body,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

use crate::state::AppState;
use async_openai::types::CreateChatCompletionRequest;

pub async fn handler(
    State(state): State<AppState>,
    Json(request): Json<CreateChatCompletionRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let api_key = state
        .secrets
        .get("OPENAI_API_KEY")
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = state
        .reqwest
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .header("Accept", "text/event-stream")
        .json(&request)
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut builder = Response::builder().status(response.status());

    for (name, value) in response.headers() {
        builder = builder.header(name, value);
    }

    builder
        .body(Body::from_stream(response.bytes_stream()))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
