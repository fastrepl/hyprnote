use tauri::{Manager, Wry};

mod commands;
mod error;
mod ext;
mod server;

pub use error::*;
pub use ext::*;

const PLUGIN_NAME: &str = "local-llm";

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub api_base: Option<String>,
    pub model: Option<hypr_llama::Llama>,
    pub server: Option<crate::server::ServerHandle>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::is_server_running::<Wry>,
            commands::is_model_loaded::<Wry>,
            commands::is_model_downloaded::<Wry>,
            commands::download_model::<Wry>,
            commands::load_model::<Wry>,
            commands::unload_model::<Wry>,
            commands::start_server::<Wry>,
            commands::stop_server::<Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(SharedState::default());
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    use async_openai::types::{
        ChatCompletionRequestMessage, ChatCompletionRequestUserMessage,
        ChatCompletionRequestUserMessageArgs, ChatCompletionRequestUserMessageContent,
        CreateChatCompletionRequest, CreateChatCompletionResponse,
        CreateChatCompletionStreamResponse,
    };
    use futures_util::StreamExt;

    #[test]
    fn export_types() {
        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    fn model_path<R: tauri::Runtime>(app: &tauri::App<R>) -> std::path::PathBuf {
        app.path()
            .data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("llm.gguf")
    }

    #[tokio::test]
    #[ignore]
    // cargo test test_dynamic_loading -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_dynamic_loading() {
        let app = create_app(tauri::test::mock_builder());
        app.start_server().await.unwrap();

        let api_base = app.api_base().await.unwrap();
        let client = reqwest::Client::new();

        let req = CreateChatCompletionRequest {
            model: "llama3.2".to_string(),
            messages: vec![ChatCompletionRequestMessage::User(
                ChatCompletionRequestUserMessage {
                    content: ChatCompletionRequestUserMessageContent::Text(
                        "Hello, world!".to_string(),
                    ),
                    ..Default::default()
                },
            )],
            ..Default::default()
        };

        let res = client
            .get(format!("{}/health", api_base))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), axum::http::StatusCode::OK);

        let res = client
            .post(format!("{}/chat/completions", api_base))
            .json(&req)
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), axum::http::StatusCode::SERVICE_UNAVAILABLE);

        let _ = app.load_model(model_path(&app)).await.unwrap();

        let res = client
            .post(format!("{}/chat/completions", api_base))
            .json(&req)
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), axum::http::StatusCode::OK);

        let _ = app.unload_model().await.unwrap();

        let res = client
            .post(format!("{}/chat/completions", api_base))
            .json(&req)
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), axum::http::StatusCode::SERVICE_UNAVAILABLE);
    }

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
    #[ignore]
    // cargo test test_non_streaming_response -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_non_streaming_response() {
        let app = create_app(tauri::test::mock_builder());
        app.load_model(model_path(&app)).await.unwrap();
        app.start_server().await.unwrap();
        let api_base = app.api_base().await.unwrap();

        let client = reqwest::Client::new();

        let response = client
            .post(format!("{}/chat/completions", api_base))
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
    #[ignore]
    // cargo test test_streaming_response -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_streaming_response() {
        let app = create_app(tauri::test::mock_builder());
        app.load_model(model_path(&app)).await.unwrap();
        app.start_server().await.unwrap();
        let api_base = app.api_base().await.unwrap();

        let client = reqwest::Client::new();

        let response = client
            .post(format!("{}/chat/completions", api_base))
            .json(&CreateChatCompletionRequest {
                stream: Some(true),
                ..shared_request()
            })
            .send()
            .await
            .unwrap();

        let stream = response.bytes_stream().map(|chunk| {
            chunk.map(|data| {
                let text = String::from_utf8_lossy(&data);
                let stripped = text.split("data: ").collect::<Vec<&str>>()[1];
                let c: CreateChatCompletionStreamResponse = serde_json::from_str(stripped).unwrap();
                c.choices
                    .first()
                    .unwrap()
                    .delta
                    .content
                    .as_ref()
                    .unwrap()
                    .clone()
            })
        });

        let content = stream
            .filter_map(|r| async move { r.ok() })
            .collect::<String>()
            .await;

        assert!(content.contains("Seoul"));
    }
}
