use tauri::{Manager, Wry};

mod commands;
mod error;
mod ext;
mod model;
mod server;

pub use error::*;
pub use ext::*;

const PLUGIN_NAME: &str = "hypr-local-llm";

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub api_base: Option<String>,
    pub model: Option<kalosm_llama::Llama>,
    pub server: Option<crate::server::ServerHandle>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_status::<Wry>,
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
        ChatCompletionRequestUserMessageContent, CreateChatCompletionRequest,
    };

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

    #[tokio::test]
    async fn test_local_llm() {
        let app = create_app(tauri::test::mock_builder());
        app.start_server().await.unwrap();

        let api_base = {
            let state = app.state::<crate::SharedState>();
            let state = state.lock().await;
            state.api_base.clone().unwrap()
        };

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

        let channel = tauri::ipc::Channel::new(|_progress: tauri::ipc::InvokeResponseBody| Ok(()));

        let _ = app.load_model(channel).await.unwrap();

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
}
