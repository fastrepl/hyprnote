use anyhow::Result;
use axum::{extract::State, http::StatusCode, response::sse, Json};
use futures_util::StreamExt;
use std::convert::Infallible;

use hypr_openai::CreateChatCompletionRequest;
use hypr_prompt::OpenAIRequest;

use crate::state::AppState;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_bridge::EnhanceRequest>,
) -> Result<sse::Sse<impl futures_core::Stream<Item = Result<sse::Event, Infallible>>>, StatusCode>
{
    let mut input_stream = state
        .openai
        .chat_completion(&CreateChatCompletionRequest {
            stream: Some(true),
            ..input.as_openai_request().unwrap()
        })
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .bytes_stream();

    let write_buffer = std::sync::Arc::new(hypr_buffer::Buffer::new());
    let read_buffer = std::sync::Arc::clone(&write_buffer);
    let is_done_writer = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let is_done_reader = std::sync::Arc::clone(&is_done_writer);

    tokio::spawn(async move {
        while let Some(chunk) = input_stream.next().await {
            if let Ok(chunk) = chunk {
                if let Ok(content) = String::from_utf8(chunk.to_vec()) {
                    for line in content.lines() {
                        if line.starts_with("data: ") && !line.ends_with("[DONE]") {
                            let data = line.trim_start_matches("data: ");

                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                if let Some(content) = json
                                    .get("choices")
                                    .and_then(|v| v.get(0))
                                    .and_then(|v| v.get("delta"))
                                    .and_then(|v| v.get("content"))
                                    .and_then(|v| v.as_str())
                                {
                                    write_buffer.write(content);
                                }
                            }
                        }
                    }
                }
            }
        }
        is_done_writer.store(true, std::sync::atomic::Ordering::Release);
    });

    let output_stream = async_stream::try_stream! {
        loop {
            if is_done_reader.load(std::sync::atomic::Ordering::Acquire) {
                if let Ok(html) = read_buffer.read() {
                    yield sse::Event::default().data(html);
                }

                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                break;
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if let Ok(html) = read_buffer.read() {
                yield sse::Event::default().data(html);
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
        }
    };

    Ok(sse::Sse::new(output_stream))
}
