use axum::{
    body::Body,
    extract::State,
    http::{Response, StatusCode},
    response::IntoResponse,
    Json,
};

use crate::state::AppState;

// https://github.com/tokio-rs/axum/blob/a192480/examples/reqwest-response/src/main.rs#L62
pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_openai::CreateChatCompletionRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let reqwest_response = state
        .openai
        .chat_completion(&input)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut response_builder = Response::builder().status(reqwest_response.status());
    *response_builder.headers_mut().unwrap() = reqwest_response.headers().clone();

    response_builder
        .body(Body::from_stream(reqwest_response.bytes_stream()))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}
