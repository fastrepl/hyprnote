use std::collections::HashMap;
use std::sync::Arc;

use tauri::{Manager, Wry};
use tokio::sync::Mutex;

mod commands;
mod error;
mod events;
mod ext;
mod manager;
mod model;
mod server;
mod store;

#[cfg(target_os = "macos")]
mod lmstudio;

pub use error::*;
use events::*;
pub use ext::*;
pub use manager::*;
pub use model::*;
pub use server::*;
pub use store::*;

const ONBOARDING_ENHANCED_MD: &str = include_str!("../assets/onboarding-enhanced.md");

const PLUGIN_NAME: &str = "local-llm";

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub api_base: Option<String>,
    pub server: Option<crate::server::ServerHandle>,
    pub download_task: HashMap<SupportedModel, tokio::task::JoinHandle<()>>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::models_dir::<Wry>,
            commands::list_supported_model,
            commands::is_server_running::<Wry>,
            commands::is_model_downloaded::<Wry>,
            commands::is_model_downloading::<Wry>,
            commands::download_model::<Wry>,
            commands::start_server::<Wry>,
            commands::stop_server::<Wry>,
            commands::restart_server::<Wry>,
            commands::get_current_model::<Wry>,
            commands::set_current_model::<Wry>,
            commands::list_downloaded_model::<Wry>,
            commands::list_custom_models::<Wry>,
            commands::get_current_model_selection::<Wry>,
            commands::set_current_model_selection::<Wry>,
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
                let state: SharedState = Arc::new(Mutex::new(State::default()));
                app.manage(state);
            }

            Ok(())
        })
        .on_event(on_event)
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

        builder
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(init())
            .build(ctx)
            .unwrap()
    }

    fn extract_content_from_stream_chunk(data: &[u8]) -> Option<String> {
        let text = String::from_utf8_lossy(data);

        let vs = text.split("data: ").collect::<Vec<&str>>();
        let stripped = match vs.get(1) {
            Some(s) => s,
            None => return None,
        };

        let c: CreateChatCompletionStreamResponse = serde_json::from_str(stripped).ok()?;
        c.choices.first()?.delta.content.clone()
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
            metadata: Some(
                serde_json::json!({ "grammar": hypr_gbnf::Grammar::Enhance { sections: None } }),
            ),
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
            metadata: Some(serde_json::json!({ "grammar": hypr_gbnf::Grammar::Title })),
            ..Default::default()
        }
    }

    #[tokio::test]
    #[ignore]
    // cargo test test_enhance_non_streaming_response -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_enhance_non_streaming_response() {
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
    // cargo test test_enhance_streaming_response -p tauri-plugin-local-llm -- --ignored --nocapture
    async fn test_enhance_streaming_response() {
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

        let stream = response.bytes_stream().filter_map(|chunk| async move {
            chunk
                .ok()
                .and_then(|data| extract_content_from_stream_chunk(&data))
        });

        let content = stream.collect::<String>().await;

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

        assert!(!content.is_empty());
        assert!(content.chars().next().unwrap().is_uppercase());
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

        let stream = response.bytes_stream().filter_map(|chunk| async move {
            chunk
                .ok()
                .and_then(|data| extract_content_from_stream_chunk(&data))
        });

        let content = stream.collect::<String>().await;

        assert!(!content.is_empty());
        assert!(content.chars().next().unwrap().is_uppercase());
        assert!(content
            .chars()
            .all(|c| c.is_alphabetic() || c.is_whitespace()));
    }
}
