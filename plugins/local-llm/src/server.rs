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
    ChatChoice, ChatChoiceStream, ChatCompletionResponseMessage, ChatCompletionStreamResponseDelta,
    CreateChatCompletionRequest, CreateChatCompletionResponse, CreateChatCompletionStreamResponse,
    Role,
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

pub async fn run_server(model_manager: crate::ModelManager) -> Result<ServerHandle, crate::Error> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/chat/completions", post(chat_completions))
        .with_state(model_manager)
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

    tracing::info!("local_llm_server_started {}", server_addr);
    Ok(server_handle)
}

async fn health(AxumState(model_manager): AxumState<crate::ModelManager>) -> impl IntoResponse {
    match model_manager.get_model().await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    };
}

async fn chat_completions(
    AxumState(model_manager): AxumState<crate::ModelManager>,
    Json(request): Json<CreateChatCompletionRequest>,
) -> Result<Response, (StatusCode, String)> {
    let model = model_manager
        .get_model()
        .await
        .map_err(|e| (StatusCode::SERVICE_UNAVAILABLE, e.to_string()))?;

    let res = inference_with_hypr(&model, &request)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(res.into_response())
}

async fn inference_with_hypr(
    model: &hypr_llama::Llama,
    request: &CreateChatCompletionRequest,
) -> Result<impl IntoResponse, crate::Error> {
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

    if request.stream.unwrap_or(false) {
        let stream = build_response(model, request)?
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

        Ok(sse::Sse::new(stream).into_response())
    } else {
        let completion = build_response(model, request)?.collect::<String>().await;

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

        Ok(Json(res).into_response())
    }
}

fn build_response(
    model: &hypr_llama::Llama,
    request: &CreateChatCompletionRequest,
) -> Result<impl futures_util::Stream<Item = String>, crate::Error> {
    let messages = request
        .messages
        .iter()
        .map(hypr_llama::FromOpenAI::from_openai)
        .collect();

    let request = hypr_llama::LlamaRequest::new(messages);
    model.generate_stream(request).map_err(Into::into)
}
