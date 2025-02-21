use tauri::{Manager, Wry};

use std::sync::Arc;
use tokio::sync::Mutex;

mod commands;
mod error;
mod events;
mod ext;

pub use error::{Error, Result};
pub use events::*;
pub use ext::ListenerPluginExt;

const PLUGIN_NAME: &str = "listener";

type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    timeline: Option<Arc<Mutex<hypr_bridge::Timeline>>>,
    mic_stream_handle: Option<tokio::task::JoinHandle<()>>,
    speaker_stream_handle: Option<tokio::task::JoinHandle<()>>,
    listen_stream_handle: Option<tokio::task::JoinHandle<()>>,
    silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    channels: Arc<Mutex<Vec<tauri::ipc::Channel<SessionEvent>>>>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_timeline::<tauri::Wry>,
            commands::subscribe::<tauri::Wry>,
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
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
    async fn test_session() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
