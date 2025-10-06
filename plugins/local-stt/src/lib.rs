use std::collections::HashMap;
use tauri::{Manager, Wry};
use tokio_util::sync::CancellationToken;

mod commands;
mod error;
mod events;
mod ext;
mod model;
mod server;
mod store;
mod types;

pub use error::*;
use events::*;
pub use ext::*;
pub use model::*;
pub use server::*;
pub use store::*;
pub use types::*;

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub am_api_key: Option<String>,
    pub download_task: HashMap<SupportedSttModel, (tokio::task::JoinHandle<()>, CancellationToken)>,
}

const PLUGIN_NAME: &str = "local-stt";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::models_dir::<Wry>,
            commands::list_ggml_backends::<Wry>,
            commands::is_model_downloaded::<Wry>,
            commands::is_model_downloading::<Wry>,
            commands::download_model::<Wry>,
            commands::get_local_model::<Wry>,
            commands::set_local_model::<Wry>,
            commands::get_servers::<Wry>,
            commands::start_server::<Wry>,
            commands::stop_server::<Wry>,
            commands::list_supported_models,
            commands::list_supported_languages,
            commands::get_custom_base_url::<Wry>,
            commands::get_custom_api_key::<Wry>,
            commands::set_custom_base_url::<Wry>,
            commands::set_custom_api_key::<Wry>,
            commands::get_provider::<Wry>,
            commands::set_provider::<Wry>,
            commands::get_custom_model::<Wry>,
            commands::set_custom_model::<Wry>,
        ])
        .typ::<hypr_whisper_local_model::WhisperModel>()
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let data_dir = app.path().app_data_dir().unwrap();
            let models_dir = app.models_dir();

            // for backward compatibility
            {
                let _ = std::fs::create_dir_all(&models_dir);

                if let Ok(entries) = std::fs::read_dir(&data_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.extension().and_then(|ext| ext.to_str()) == Some("bin")
                            && path
                                .file_name()
                                .and_then(|name| name.to_str())
                                .map(|name| name.contains("ggml"))
                                .unwrap_or(false)
                        {
                            let new_path = models_dir.join(path.file_name().unwrap());
                            let _ = std::fs::rename(path, new_path);
                        }
                    }
                }
            }

            let api_key = {
                #[cfg(not(debug_assertions))]
                {
                    Some(env!("AM_API_KEY").to_string())
                }

                #[cfg(debug_assertions)]
                {
                    option_env!("AM_API_KEY").map(|s| s.to_string())
                }
            };

            app.manage(SharedState::new(tokio::sync::Mutex::new(State {
                am_api_key: api_key,
                ..Default::default()
            })));

            Ok(())
        })
        .on_event(on_event)
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
        let app = create_app(tauri::test::mock_builder());
        hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);
        let model = app.get_local_model();
        println!("model: {:#?}", model);
    }
}
