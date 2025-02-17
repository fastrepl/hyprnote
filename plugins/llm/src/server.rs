use axum::response::IntoResponse;
use axum::{
    extract::State as AxumState,
    response::Json,
    routing::{get, post},
    Router,
};
use std::net::{Ipv4Addr, SocketAddr};

use futures_util::{pin_mut, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;

use async_openai::types::{
    ChatChoice, ChatCompletionResponseMessage, CreateChatCompletionRequest,
    CreateChatCompletionResponse, Role,
};

struct State {
    model: Option<crate::inference::Model>,
}

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

pub async fn run_server() -> anyhow::Result<ServerHandle> {
    let model = crate::inference::Model::new()?;
    let state = Arc::new(Mutex::new(State { model: Some(model) }));

    let app = Router::new()
        .route("/chat/completions", post(chat_completions))
        .route("/health", get(health))
        .with_state(state.clone());

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

async fn chat_completions(
    AxumState(state): AxumState<Arc<Mutex<State>>>,
    Json(payload): Json<CreateChatCompletionRequest>,
) -> Result<Json<CreateChatCompletionResponse>, String> {
    let mut state = state.lock().await;

    let stream = state.model.as_mut().unwrap().generate(payload.clone());
    pin_mut!(stream);

    let res = stream.map(|r| r.unwrap()).collect::<String>().await;

    #[allow(deprecated)]
    let empty_message = ChatCompletionResponseMessage {
        content: None,
        refusal: None,
        tool_calls: None,
        role: Role::Assistant,
        audio: None,
        function_call: None,
    };

    let created = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let res = CreateChatCompletionResponse {
        id: uuid::Uuid::new_v4().to_string(),
        choices: vec![ChatChoice {
            message: ChatCompletionResponseMessage {
                content: Some(res),
                ..empty_message
            },
            index: 0,
            finish_reason: None,
            logprobs: None,
        }],
        created: created as u32,
        model: payload.model,
        service_tier: None,
        system_fingerprint: None,
        object: "chat.completion".to_string(),
        usage: None,
    };

    Ok(Json(res))
}

async fn health() -> impl IntoResponse {
    "ok"
}

#[cfg(test)]
mod tests {
    use super::run_server;
    use async_openai::types::{
        ChatCompletionRequestMessage, ChatCompletionRequestUserMessageArgs,
        CreateChatCompletionRequest, CreateChatCompletionResponse,
    };

    #[tokio::test]
    async fn test_chat_completions() {
        let server = run_server().await.unwrap();

        let url = format!("http://{}/chat/completions", server.addr);
        let client = reqwest::Client::new();

        let response = client
            .post(url)
            .json(&CreateChatCompletionRequest {
                messages: vec![ChatCompletionRequestMessage::User(
                    ChatCompletionRequestUserMessageArgs::default()
                        .content("What is the capital of South Korea?")
                        .build()
                        .unwrap()
                        .into(),
                )],
                ..Default::default()
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
}
