use anyhow::Result;
use axum::{extract::State, http::StatusCode, response::sse, Json};
use futures_util::StreamExt;
use hypr_openai::{
    ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs,
    CreateChatCompletionRequest,
};
use std::convert::Infallible;

use crate::state::AppState;

pub async fn handler(
    State(state): State<AppState>,
    Json(input): Json<hypr_bridge::EnhanceRequest>,
) -> Result<sse::Sse<impl futures_core::Stream<Item = Result<sse::Event, Infallible>>>, StatusCode>
{
    let prompt = format!(
        r#"
        ```user
        {}
        ```

        ```editor
        {}
        ```

        ```template
        {}
        ```

        Your job is to rewrite the editor content, while adhering to the template.
        
        Response format guide:
        - Allowed tags for the editor content: "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "div", "span", "strong", "em", "i".
        - No need to wrap the output with <body>, <html> tags or even "```html" or anything like that.
        - Your response itself should be valid HTML. No explanation is needed."#,
        serde_json::to_string(&input.user).unwrap(),
        serde_json::to_string(&input.editor).unwrap(),
        serde_json::to_string(&input.template).unwrap(),
    );

    let request = CreateChatCompletionRequest {
        model: "gpt-4o".to_string(),
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
        temperature: Some(0.1),
        stream: Some(true),
        ..CreateChatCompletionRequest::default()
    };

    let write_buffer = std::sync::Arc::new(hypr_html::HtmlBuffer::new());
    let read_buffer = std::sync::Arc::clone(&write_buffer);
    let is_done_writer = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let is_done_reader = std::sync::Arc::clone(&is_done_writer);

    let mut input_stream = state
        .openai
        .chat_completion(&request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .bytes_stream();

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
                let html = read_buffer.read().unwrap();
                yield sse::Event::default().data(html);
                break;
            }

            let html = read_buffer.read().unwrap();
            yield sse::Event::default().data(html);
            tokio::time::sleep(tokio::time::Duration::from_millis(350)).await;
        }
    };

    Ok(sse::Sse::new(output_stream))
}
