use axum::{extract::State, http::StatusCode, Json};

use hypr_openai::CreateChatCompletionRequest;
use hypr_prompt::OpenAIRequest;

use crate::state::AppState;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_bridge::SummarizeTranscriptRequest>,
) -> Result<Json<hypr_bridge::SummarizeTranscriptResponse>, StatusCode> {
    let response = state
        .openai
        .chat_completion(&CreateChatCompletionRequest {
            stream: Some(false),
            ..input.as_openai_request().unwrap()
        })
        .await
        .map_err(|e| {
            tracing::error!("summarize_transcript: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .json()
        .await
        .map_err(|e| {
            tracing::error!("summarize_transcript: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(response))
}
