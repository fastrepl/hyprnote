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

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_timeline::<Wry>,
            commands::subscribe::<Wry>,
            commands::start_session::<Wry>,
            commands::stop_session::<Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
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
        make_specta_builder()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }
}
