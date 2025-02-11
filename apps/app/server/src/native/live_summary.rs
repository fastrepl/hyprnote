use axum::{extract::State, http::StatusCode, Json};

use hypr_openai::CreateChatCompletionRequest;
use hypr_prompt::OpenAIRequest;

use crate::state::AppState;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_bridge::LiveSummaryRequest>,
) -> Result<Json<hypr_bridge::LiveSummaryResponse>, (StatusCode, String)> {
    let response = state
        .openai
        .chat_completion(&CreateChatCompletionRequest {
            stream: Some(false),
            ..input.as_openai_request().unwrap()
        })
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(response))
}
