use axum::{
    extract::State as AxumState,
    http::StatusCode,
    response::{sse, IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use futures_util::StreamExt;
use std::net::{Ipv4Addr, SocketAddr};

use kalosm_llama::prelude::*;
use kalosm_streams::text_stream::TextStream;

use async_openai::types::{
    ChatChoice, ChatCompletionRequestMessage, ChatCompletionRequestSystemMessageContent,
    ChatCompletionRequestUserMessageContent, ChatCompletionResponseMessage,
    CreateChatCompletionRequest, CreateChatCompletionResponse, Role,
};

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    shutdown: tokio::sync::watch::Sender<()>,
}

impl ServerHandle {
    pub fn shutdown(self) -> Result<(), tokio::sync::watch::error::SendError<()>> {
        self.shutdown.send(())
    }
}

pub async fn run_server(state: crate::SharedState) -> anyhow::Result<ServerHandle> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/chat/completions", post(chat_completions))
        .with_state(state);

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0))).await?;

    let server_addr = listener.local_addr()?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

    let server_handle = ServerHandle {
        addr: server_addr,
        shutdown: shutdown_tx,
    };

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                shutdown_rx.changed().await.ok();
            })
            .await
            .unwrap();
    });

    Ok(server_handle)
}

async fn health() -> impl IntoResponse {
    "ok"
}

async fn chat_completions(
    AxumState(state): AxumState<crate::SharedState>,
    Json(request): Json<CreateChatCompletionRequest>,
) -> Response {
    #[allow(deprecated)]
    let empty_message = ChatCompletionResponseMessage {
        content: None,
        refusal: None,
        tool_calls: None,
        role: Role::Assistant,
        audio: None,
        function_call: None,
    };

    let empty_choice = ChatChoice {
        message: empty_message.clone(),
        index: 0,
        finish_reason: None,
        logprobs: None,
    };

    let empty_response = CreateChatCompletionResponse {
        id: uuid::Uuid::new_v4().to_string(),
        choices: vec![],
        created: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as u32,
        model: request.model.clone(),
        service_tier: None,
        system_fingerprint: None,
        object: "chat.completion".to_string(),
        usage: None,
    };

    let state = state.lock().await;

    let model = match &state.model {
        Some(model) => model,
        None => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };

    if request.stream.unwrap_or(false) {
        let stream = build_response(model, &request)
            .words()
            .map(|word| Ok::<_, std::convert::Infallible>(sse::Event::default().data(word)));

        sse::Sse::new(stream).into_response()
    } else {
        let completion = build_response(model, &request).all_text().await;

        let res = CreateChatCompletionResponse {
            choices: vec![ChatChoice {
                message: ChatCompletionResponseMessage {
                    content: Some(completion),
                    ..empty_message
                },
                ..empty_choice
            }],
            ..empty_response
        };

        Json(res).into_response()
    }
}

fn build_response(
    model: &Llama,
    request: &CreateChatCompletionRequest,
) -> ChatResponseBuilder<'static, Llama> {
    fn extract_text_content(message: &ChatCompletionRequestMessage) -> Option<&String> {
        match message {
            ChatCompletionRequestMessage::System(msg) => {
                if let ChatCompletionRequestSystemMessageContent::Text(text) = &msg.content {
                    Some(text)
                } else {
                    None
                }
            }
            ChatCompletionRequestMessage::User(msg) => {
                if let ChatCompletionRequestUserMessageContent::Text(text) = &msg.content {
                    Some(text)
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    let system_message_content = request
        .messages
        .iter()
        .find(|msg| matches!(msg, ChatCompletionRequestMessage::System(_)))
        .and_then(extract_text_content);

    let user_message_content = request
        .messages
        .iter()
        .find(|msg| matches!(msg, ChatCompletionRequestMessage::User(_)))
        .and_then(extract_text_content)
        .unwrap();

    let mut chat = model.chat();

    if let Some(system_message_content) = system_message_content {
        chat = chat.with_system_prompt(system_message_content);
    }

    chat.into_add_message(ChatMessage::new(
        MessageType::UserMessage,
        user_message_content,
    ))
}

#[cfg(test)]
mod tests {
    use super::run_server;
    use async_openai::types::{
        ChatCompletionRequestMessage, ChatCompletionRequestUserMessageArgs,
        CreateChatCompletionRequest, CreateChatCompletionResponse,
    };
    use futures_util::StreamExt;

    fn shared_request() -> CreateChatCompletionRequest {
        CreateChatCompletionRequest {
            messages: vec![ChatCompletionRequestMessage::User(
                ChatCompletionRequestUserMessageArgs::default()
                    .content("What is the capital of South Korea?")
                    .build()
                    .unwrap()
                    .into(),
            )],
            ..Default::default()
        }
    }

    #[tokio::test]
    async fn test_chat_completions_non_streaming() {
        let state = crate::SharedState::default();
        {
            let mut state = state.lock().await;
            state.model = Some(
                kalosm_llama::Llama::builder()
                    .with_source(kalosm_llama::LlamaSource::llama_3_2_3b_chat())
                    .build()
                    .await
                    .unwrap(),
            );
        }

        let server = run_server(state).await.unwrap();
        let client = reqwest::Client::new();

        let response = client
            .post(format!("http://{}/chat/completions", server.addr))
            .json(&CreateChatCompletionRequest {
                stream: Some(false),
                ..shared_request()
            })
            .send()
            .await
            .unwrap();

        let data = response
            .json::<CreateChatCompletionResponse>()
            .await
            .unwrap();

        let content = data.choices[0].message.content.clone().unwrap();
        assert!(content.contains("Seoul"));
    }

    #[tokio::test]
    async fn test_chat_completions_streaming() {
        let state = crate::SharedState::default();
        {
            let mut state = state.lock().await;
            state.model = Some(
                kalosm_llama::Llama::builder()
                    .with_source(kalosm_llama::LlamaSource::llama_3_2_3b_chat())
                    .build()
                    .await
                    .unwrap(),
            );
        }

        let server = run_server(state).await.unwrap();
        let client = reqwest::Client::new();

        let response = client
            .post(format!("http://{}/chat/completions", server.addr))
            .json(&CreateChatCompletionRequest {
                stream: Some(true),
                ..shared_request()
            })
            .send()
            .await
            .unwrap();

        let mut chunks = Vec::new();
        let mut stream = response.bytes_stream();
        while let Some(Ok(chunk)) = stream.next().await {
            chunks.push(chunk);
        }

        let content = String::from_utf8(chunks.concat()).unwrap();
        assert!(content.contains("Seoul"));
    }
}
