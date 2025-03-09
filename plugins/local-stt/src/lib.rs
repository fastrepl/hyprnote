use tauri::{Manager, Wry};

mod chunker;
mod commands;
mod error;
mod ext;
mod model;
mod server;

pub use error::*;
pub use ext::*;

pub type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub api_base: Option<String>,
    pub model: Option<rwhisper::Whisper>,
    pub server: Option<crate::server::ServerHandle>,
}

const PLUGIN_NAME: &str = "hypr-local-stt";

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
    async fn test_local_stt() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
