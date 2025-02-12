use axum::{extract::State, http::StatusCode, Json};

use hypr_openai::CreateChatCompletionRequest;
use hypr_prompt::OpenAIRequest;

use crate::state::AppState;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_bridge::PostprocessEnhanceRequest>,
) -> Result<Json<hypr_bridge::PostprocessEnhanceResponse>, (StatusCode, String)> {
    let req = CreateChatCompletionRequest {
        stream: Some(false),
        ..input.as_openai_request().unwrap()
    };

    let res: hypr_openai::CreateChatCompletionResponse = state
        .openai
        .chat_completion(&req)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let content = res
        .choices
        .first()
        .unwrap()
        .message
        .content
        .as_ref()
        .unwrap();

    let output: hypr_bridge::PostprocessEnhanceResponse = serde_json::from_str(content)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(output))
}
