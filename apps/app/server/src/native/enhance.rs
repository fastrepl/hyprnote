use anyhow::Result;
use async_openai::types::{
    ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs,
    CreateChatCompletionRequest, ResponseFormat, ResponseFormatJsonSchema,
};
use axum::{
    body::Body,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

use crate::state::AppState;
use hypr_bridge::enhance;

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct EnhanceRequest {
    pub user: hypr_db::user::ConfigDataProfile,
    pub editor: serde_json::Value,
    pub template: hypr_db::user::Template,
}

// TODO: https://github.com/tokio-rs/axum/blob/main/examples/validator/src/main.rs
pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<EnhanceRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let api_key = std::env::var("OPENAI_API_KEY").unwrap();

    let prompt = format!(
        r#"
        ```editor
        {}
        ```

        Your job is to transform above editor state, based on the template below.

        ```template
        {}
        ```

        Generate more sentences that are similar to the input."#,
        serde_json::to_string(&input.editor).unwrap(),
        serde_json::to_string(&input.template).unwrap(),
    );

    let request = CreateChatCompletionRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            ChatCompletionRequestSystemMessageArgs::default()
                .content("You are a helpful assistant that only outputs JSON.")
                .build()
                .unwrap()
                .into(),
            ChatCompletionRequestUserMessageArgs::default()
                .content(prompt.trim())
                .build()
                .unwrap()
                .into(),
        ],
        response_format: Some(ResponseFormat::JsonSchema {
            json_schema: ResponseFormatJsonSchema {
                strict: Some(true),
                schema: Some(enhance::schema()),
                name: "enhanced_editor_state".into(),
                description: None,
            },
        }),
        temperature: Some(0.0),
        stream: Some(true),
        ..CreateChatCompletionRequest::default()
    };

    let response = state
        .reqwest
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "text/event-stream")
        .json(&request)
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
