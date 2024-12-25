use anyhow::Result;
use async_openai::types::{
    ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs,
    CreateChatCompletionRequest, ResponseFormat,
};
use axum::{
    body::Body,
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use http::StatusCode;

use crate::state::AppState;
use hypr_bridge::{EnhanceInput, EnhanceOutput};

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<EnhanceInput>,
) -> Result<impl IntoResponse, StatusCode> {
    let api_key = state.secrets.get("OPENAI_API_KEY").unwrap();

    let json_schema = convert_json_schema(schemars::schema_for!(EnhanceOutput))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let request = CreateChatCompletionRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            ChatCompletionRequestSystemMessageArgs::default()
                .content("You are a helpful assistant that only outputs JSON.")
                .build()
                .unwrap()
                .into(),
            ChatCompletionRequestUserMessageArgs::default()
                .content(serde_json::to_string(&input).unwrap())
                .build()
                .unwrap()
                .into(),
        ],
        response_format: Some(ResponseFormat::JsonSchema { json_schema }),
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

fn convert_json_schema(
    schema: schemars::Schema,
) -> Result<async_openai::types::ResponseFormatJsonSchema> {
    let json_value = serde_json::to_value(schema)?;
    let json_schema = serde_json::from_value(json_value).unwrap();
    Ok(json_schema)
}
