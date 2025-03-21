use axum::{
    extract::State as AxumState,
    http::StatusCode,
    response::{sse, IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use futures_util::StreamExt;
use std::net::{Ipv4Addr, SocketAddr};
use tower_http::cors::{self, CorsLayer};

use async_openai::types::{
    ChatChoice, ChatChoiceStream, ChatCompletionRequestMessage,
    ChatCompletionRequestSystemMessageContent, ChatCompletionRequestUserMessageContent,
    ChatCompletionResponseMessage, ChatCompletionStreamResponseDelta, CreateChatCompletionRequest,
    CreateChatCompletionResponse, CreateChatCompletionStreamResponse, Role,
};

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

impl ServerHandle {
    pub fn shutdown(self) -> Result<(), tokio::sync::watch::error::SendError<()>> {
        self.shutdown.send(())
    }
}

pub async fn run_server(state: crate::SharedState) -> Result<ServerHandle, crate::Error> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/chat/completions", post(chat_completions))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        );

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

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

    let empty_stream_response = CreateChatCompletionStreamResponse {
        id: empty_response.id.clone(),
        choices: vec![],
        created: empty_response.created,
        model: empty_response.model.clone(),
        service_tier: None,
        system_fingerprint: None,
        object: "chat.completion.chunk".to_string(),
        usage: None,
    };

    #[allow(deprecated)]
    let empty_stream_response_delta = ChatCompletionStreamResponseDelta {
        content: None,
        function_call: None,
        tool_calls: None,
        role: None,
        refusal: None,
    };

    let state = state.lock().await;

    let model = match &state.model {
        Some(model) => model,
        None => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };

    if request.stream.unwrap_or(false) {
        let stream = build_response(model, &request)
            .map(move |chunk| CreateChatCompletionStreamResponse {
                choices: vec![ChatChoiceStream {
                    index: 0,
                    delta: ChatCompletionStreamResponseDelta {
                        content: Some(chunk),
                        ..empty_stream_response_delta.clone()
                    },
                    finish_reason: None,
                    logprobs: None,
                }],
                ..empty_stream_response.clone()
            })
            .map(|chunk| {
                Ok::<_, std::convert::Infallible>(
                    sse::Event::default().data(serde_json::to_string(&chunk).unwrap()),
                )
            });

        sse::Sse::new(stream).into_response()
    } else {
        let completion = build_response(model, &request).collect::<String>().await;

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
    model: &hypr_llama::Llama,
    request: &CreateChatCompletionRequest,
) -> impl futures_util::Stream<Item = String> {
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

    let request = hypr_llama::LlamaRequest::builder()
        .system_message(
            system_message_content.unwrap_or(&"You are a helpful assistant.".to_string()),
        )
        .user_message(user_message_content)
        .build();

    model.generate_stream(request)
}

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
