use std::collections::HashMap;
use tauri::{Manager, Wry};

mod commands;
mod error;
mod ext;
mod manager;
mod model;
pub mod server;
mod store;

pub use error::*;
pub use ext::*;
pub use model::*;

use server::*;
use store::*;

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub api_base: Option<String>,
    pub server: Option<crate::server::ServerHandle>,
    pub download_task: HashMap<SupportedModel, tokio::task::JoinHandle<()>>,
}

const PLUGIN_NAME: &str = "local-stt";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::is_server_running::<Wry>,
            commands::is_model_downloaded::<Wry>,
            commands::is_model_downloading::<Wry>,
            commands::download_model::<Wry>,
            commands::start_server::<Wry>,
            commands::stop_server::<Wry>,
            commands::get_current_model::<Wry>,
            commands::set_current_model::<Wry>,
            commands::list_supported_models,
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
            .plugin(init())
            .plugin(tauri_plugin_store::Builder::default().build())
            .build(ctx)
            .unwrap()
    }

    #[tokio::test]
    #[ignore]
    // cargo test test_local_stt -p tauri-plugin-local-stt -- --ignored --nocapture
    async fn test_local_stt() {
        use futures_util::StreamExt;
        use tauri_plugin_listener::ListenClientBuilder;

        let app = create_app(tauri::test::mock_builder());
        app.start_server().await.unwrap();
        let api_base = app.api_base().await.unwrap();

        let listen_client = ListenClientBuilder::default()
            .api_base(api_base)
            .api_key("NONE")
            .params(hypr_listener_interface::ListenParams {
                language: hypr_language::ISO639::En.into(),
                ..Default::default()
            })
            .build();

        let audio_source = rodio::Decoder::new_wav(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let listen_stream = listen_client.from_audio(audio_source).await.unwrap();
        let mut listen_stream = Box::pin(listen_stream);

        while let Some(chunk) = listen_stream.next().await {
            println!("{:?}", chunk);
        }

        app.stop_server().await.unwrap();
    }

    #[tokio::test]
    #[ignore]
    // cargo test test_local_stt2 -p tauri-plugin-local-stt -- --ignored --nocapture
    async fn test_local_stt2() {
        let app = create_app(tauri::test::mock_builder());

        let model_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("ggml-tiny.en-q8_0.bin");

        let words = app
            .process_wav(model_path, hypr_data::english_1::AUDIO_PATH)
            .await
            .unwrap();

        println!("{:?}", words);
    }
}
