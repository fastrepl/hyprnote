use anyhow::Result;
use axum::{extract::State, http::StatusCode, Json};

use hypr_openai::CreateChatCompletionRequest;
use hypr_prompt::OpenAIRequest;

use crate::state::AppState;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_bridge::CreateTitleRequest>,
) -> Result<Json<hypr_bridge::CreateTitleResponse>, StatusCode> {
    let response = state
        .openai
        .chat_completion(&CreateChatCompletionRequest {
            stream: Some(false),
            ..input.as_openai_request().unwrap()
        })
        .await
        .map_err(|e| {
            tracing::error!("Error creating title: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .json::<hypr_bridge::CreateTitleResponse>()
        .await
        .map_err(|e| {
            tracing::error!("Error creating title: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(response))
}
