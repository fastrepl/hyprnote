use std::net::{Ipv4Addr, SocketAddr};
use std::pin::Pin;

use async_openai::types::{
    ChatChoice, ChatChoiceStream, ChatCompletionMessageToolCallChunk,
    ChatCompletionResponseMessage, ChatCompletionStreamResponseDelta, ChatCompletionToolType,
    CreateChatCompletionRequest, CreateChatCompletionResponse, CreateChatCompletionStreamResponse,
    FunctionCallStream, Role,
};
use axum::{
    extract::State as AxumState,
    http::StatusCode,
    response::{sse, IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};

use futures_util::StreamExt;
use tokio::sync::mpsc;
use tower_http::cors::{self, CorsLayer};

use crate::local::ModelManager;

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

pub async fn run_server(model_manager: ModelManager) -> Result<ServerHandle, crate::Error> {
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

async fn health(AxumState(model_manager): AxumState<ModelManager>) -> impl IntoResponse {
    match model_manager.get_model().await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    };
}

async fn chat_completions(
    AxumState(model_manager): AxumState<ModelManager>,
    Json(request): Json<CreateChatCompletionRequest>,
) -> Result<Response, (StatusCode, String)> {
    let inference_result = if request.model == "mock-onboarding" {
        inference_with_mock(&request).await
    } else {
        let model = model_manager
            .get_model()
            .await
            .map_err(|e| (StatusCode::SERVICE_UNAVAILABLE, e.to_string()))?;

        inference_without_mock(&model, &request).await
    };

    inference_result.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

async fn build_and_send_response(
    request: &CreateChatCompletionRequest,
    response_stream_fn: impl FnOnce() -> Result<
        Pin<Box<dyn futures_util::Stream<Item = StreamEvent> + Send>>,
        crate::Error,
    >,
) -> Result<Response, crate::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let created = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as u32;
    let model_name = request.model.clone();

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

    let base_response_template = CreateChatCompletionResponse {
        id: id.clone(),
        choices: vec![],
        created,
        model: model_name.clone(),
        service_tier: None,
        system_fingerprint: None,
        object: "chat.completion".to_string(),
        usage: None,
    };

    let base_stream_response_template = CreateChatCompletionStreamResponse {
        id,
        choices: vec![],
        created,
        model: model_name,
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

    let is_stream = request.stream.unwrap_or(false);

    if !is_stream {
        let mut stream = response_stream_fn()?;
        let mut completion = String::new();

        while let Some(event) = futures_util::StreamExt::next(&mut stream).await {
            match event {
                StreamEvent::Content(chunk) => completion.push_str(&chunk),
                StreamEvent::Progress(_) => {}
            }
        }

        let res = CreateChatCompletionResponse {
            choices: vec![ChatChoice {
                message: ChatCompletionResponseMessage {
                    content: Some(completion),
                    ..empty_message
                },
                ..empty_choice
            }],
            ..base_response_template
        };
        Ok(Json(res).into_response())
    } else {
        let source_stream = response_stream_fn()?;
        let stream = source_stream
            .enumerate()
            .map(move |(index, event)| {
                let delta_template = empty_stream_response_delta.clone();
                let response_template = base_stream_response_template.clone();

                match event {
                    StreamEvent::Content(chunk) => CreateChatCompletionStreamResponse {
                        choices: vec![ChatChoiceStream {
                            index: 0,
                            delta: ChatCompletionStreamResponseDelta {
                                content: Some(chunk),
                                ..delta_template
                            },
                            finish_reason: None,
                            logprobs: None,
                        }],
                        ..response_template
                    },
                    StreamEvent::Progress(progress) => CreateChatCompletionStreamResponse {
                        choices: vec![ChatChoiceStream {
                            index: 0,
                            delta: ChatCompletionStreamResponseDelta {
                                tool_calls: Some(vec![ChatCompletionMessageToolCallChunk {
                                    index: index.try_into().unwrap_or(0),
                                    id: Some("progress_update".to_string()),
                                    r#type: Some(ChatCompletionToolType::Function),
                                    function: Some(FunctionCallStream {
                                        name: Some("update_progress".to_string()),
                                        arguments: Some(
                                            serde_json::to_string(&serde_json::json!({
                                                "progress": progress
                                            }))
                                            .unwrap(),
                                        ),
                                    }),
                                }]),
                                ..delta_template
                            },
                            finish_reason: None,
                            logprobs: None,
                        }],
                        ..response_template
                    },
                }
            })
            .map(|chunk| {
                Ok::<_, std::convert::Infallible>(
                    sse::Event::default().data(serde_json::to_string(&chunk).unwrap()),
                )
            });
        Ok(sse::Sse::new(stream).into_response())
    }
}

async fn inference_with_mock(
    request: &CreateChatCompletionRequest,
) -> Result<Response, crate::Error> {
    build_and_send_response(request, || Ok(build_mock_response())).await
}

async fn inference_without_mock(
    model: &hypr_llama::Llama,
    request: &CreateChatCompletionRequest,
) -> Result<Response, crate::Error> {
    build_and_send_response(request, || build_response(model, request)).await
}

#[derive(Debug, Clone)]
enum StreamEvent {
    Content(String),
    Progress(f64),
}

fn build_response(
    model: &hypr_llama::Llama,
    request: &CreateChatCompletionRequest,
) -> Result<Pin<Box<dyn futures_util::Stream<Item = StreamEvent> + Send>>, crate::Error> {
    let messages = request
        .messages
        .iter()
        .map(hypr_llama::FromOpenAI::from_openai)
        .collect();

    let grammar = select_grammar(
        &model.name,
        request
            .metadata
            .as_ref()
            .and_then(|v| v.get("grammar").and_then(|v| v.as_str())),
    );

    let request = hypr_llama::LlamaRequest { messages, grammar };

    let (progress_sender, mut progress_receiver) = mpsc::unbounded_channel::<f64>();

    let content_stream = model.generate_stream_with_callback(
        request,
        Box::new(move |v| {
            let _ = progress_sender.send(v);
        }),
    )?;

    let mixed_stream = async_stream::stream! {
        tokio::pin!(content_stream);

        loop {
            tokio::select! {
                content_result = content_stream.next() => {
                    match content_result {
                        Some(content) => yield StreamEvent::Content(content),
                        None => break,
                    }
                },
                progress_result = progress_receiver.recv() => {
                    match progress_result {
                        Some(progress) => yield StreamEvent::Progress(progress),
                        None => {}
                    }
                }
            }
        }
    };

    Ok(Box::pin(mixed_stream))
}

fn build_mock_response() -> Pin<Box<dyn futures_util::Stream<Item = StreamEvent> + Send>> {
    use futures_util::stream::{self, StreamExt};
    use std::time::Duration;

    let content = crate::ONBOARDING_ENHANCED_MD;
    let chunk_size = 30;

    let chunks = content
        .chars()
        .collect::<Vec<_>>()
        .chunks(chunk_size)
        .map(|c| c.iter().collect::<String>())
        .collect::<Vec<_>>();

    Box::pin(stream::iter(chunks).then(|chunk| async move {
        tokio::time::sleep(Duration::from_millis(200)).await;
        StreamEvent::Content(chunk)
    }))
}

fn select_grammar(model_name: &hypr_llama::ModelName, task: Option<&str>) -> Option<String> {
    match task {
        Some("enhance") => match model_name {
            hypr_llama::ModelName::HyprLLM => Some(hypr_gbnf::GBNF::EnhanceHypr.build()),
            _ => Some(hypr_gbnf::GBNF::EnhanceOther.build()),
        },
        Some("title") => Some(hypr_gbnf::GBNF::Title.build()),
        Some("tags") => Some(hypr_gbnf::GBNF::Tags.build()),
        _ => None,
    }
}
