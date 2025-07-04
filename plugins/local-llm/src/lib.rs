use std::sync::Arc;
use tauri::{Manager, Wry};
use tokio::sync::Mutex;

mod commands;
mod error;
mod ext;
mod local;
mod server;
mod store;

pub use error::*;
pub use ext::*;
pub use store::*;

const ONBOARDING_ENHANCED_MD: &str = include_str!("../assets/onboarding-enhanced.md");

const PLUGIN_NAME: &str = "local-llm";

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

pub struct State {
    pub api_base: Option<String>,
    pub server: Option<crate::server::ServerHandle>,
    pub model_path: std::path::PathBuf,
    pub download_task: Option<tokio::task::JoinHandle<()>>,
}

impl State {
    pub fn new(model_path: std::path::PathBuf) -> Self {
        Self {
            api_base: None,
            server: None,
            model_path,
            download_task: None,
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_supported_models,
            commands::is_server_running::<Wry>,
            commands::is_model_downloaded::<Wry>,
            commands::is_model_downloading::<Wry>,
            commands::download_model::<Wry>,
            commands::start_server::<Wry>,
            commands::stop_server::<Wry>,
            commands::restart_server::<Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let data_dir = app.path().app_data_dir().unwrap();
            let models_dir = app.models_dir();

            // for backward compatibility
            {
                let _ = std::fs::create_dir_all(&models_dir);

                if let Ok(entries) = std::fs::read_dir(&data_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.extension().and_then(|ext| ext.to_str()) == Some("gguf") {
                            let new_path = models_dir.join(path.file_name().unwrap());
                            let _ = std::fs::rename(path, new_path);
                        }
                    }
                }
            }

            {
                let model_path = models_dir.join("llm.gguf");
                let state: SharedState = Arc::new(Mutex::new(State::new(model_path)));
                app.manage(state);
            }

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    use async_openai::types::{
        ChatCompletionRequestMessage, ChatCompletionRequestSystemMessageArgs,
        ChatCompletionRequestUserMessageArgs, CreateChatCompletionRequest,
        CreateChatCompletionResponse, CreateChatCompletionStreamResponse,
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
        let mut ctx = tauri::test::mock_context(tauri::test::noop_assets());
        ctx.config_mut().identifier = "com.hyprnote.dev".to_string();
        builder.plugin(init()).build(ctx).unwrap()
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

    fn title_generation_request() -> CreateChatCompletionRequest {
        CreateChatCompletionRequest {
            messages: vec![
                ChatCompletionRequestMessage::System(
                    ChatCompletionRequestSystemMessageArgs::default()
                        .content("You are a professional assistant that generates a refined title for a meeting note in English.")
                        .build()
                        .unwrap()
                        .into(),
                ),
                ChatCompletionRequestMessage::User(
                    ChatCompletionRequestUserMessageArgs::default()
                        .content("# Enhanced Meeting Note:\n\n<enhanced_note>\n# Project Planning\n- Discussed Q1 roadmap\n- Reviewed budget allocations\n- Set team responsibilities\n</enhanced_note>")
                        .build()
                        .unwrap()
                        .into(),
                ),
            ],
            ..Default::default()
        }
    }

    #[tokio::test]
    #[ignore]
    // cargo test test_non_streaming_response -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_non_streaming_response() {
        let app = create_app(tauri::test::mock_builder());
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

    #[tokio::test]
    #[ignore]
    // cargo test test_title_generation_non_streaming -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_title_generation_non_streaming() {
        let app = create_app(tauri::test::mock_builder());
        app.start_server().await.unwrap();
        let api_base = app.api_base().await.unwrap();

        let client = reqwest::Client::new();

        let response = client
            .post(format!("{}/chat/completions", api_base))
            .json(&CreateChatCompletionRequest {
                stream: Some(false),
                ..title_generation_request()
            })
            .send()
            .await
            .unwrap();

        let data = response
            .json::<CreateChatCompletionResponse>()
            .await
            .unwrap();

        let content = data.choices[0].message.content.clone().unwrap();
        println!("Generated title: {}", content);

        // Title should start with capital letter and contain only letters/spaces
        assert!(!content.is_empty());
        assert!(content.chars().next().unwrap().is_uppercase());
        assert!(content
            .chars()
            .all(|c| c.is_alphabetic() || c.is_whitespace()));
    }

    #[tokio::test]
    #[ignore]
    // cargo test test_title_generation_streaming -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_title_generation_streaming() {
        let app = create_app(tauri::test::mock_builder());
        app.start_server().await.unwrap();
        let api_base = app.api_base().await.unwrap();

        let client = reqwest::Client::new();

        let response = client
            .post(format!("{}/chat/completions", api_base))
            .json(&CreateChatCompletionRequest {
                stream: Some(true),
                ..title_generation_request()
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

        println!("Generated title (streaming): {}", content);

        // Title should start with capital letter and contain only letters/spaces
        assert!(!content.is_empty());
        assert!(content.chars().next().unwrap().is_uppercase());
        assert!(content
            .chars()
            .all(|c| c.is_alphabetic() || c.is_whitespace()));
    }
}
