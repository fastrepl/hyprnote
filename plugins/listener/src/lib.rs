use tauri::Manager;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

mod client;
mod commands;
mod error;
mod events;
mod ext;
mod session;

pub use client::*;
pub use error::*;
pub use events::*;
pub use ext::ListenerPluginExt;
pub use session::*;

pub use hypr_listener_interface::*;

const PLUGIN_NAME: &str = "listener";

pub type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    timeline: Option<Arc<Mutex<hypr_timeline::Timeline>>>,
    mic_stream_handle: Option<tokio::task::JoinHandle<()>>,
    speaker_stream_handle: Option<tokio::task::JoinHandle<()>>,
    listen_stream_handle: Option<tokio::task::JoinHandle<()>>,
    silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    channels: Arc<Mutex<HashMap<u32, tauri::ipc::Channel<SessionEvent>>>>,
    mic_muted_tx: Option<tokio::sync::watch::Sender<bool>>,
    speaker_muted_tx: Option<tokio::sync::watch::Sender<bool>>,
    mic_muted: Option<bool>,
    speaker_muted: Option<bool>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::check_microphone_access::<tauri::Wry>,
            commands::check_system_audio_access::<tauri::Wry>,
            commands::request_microphone_access::<tauri::Wry>,
            commands::request_system_audio_access::<tauri::Wry>,
            commands::open_microphone_access_settings::<tauri::Wry>,
            commands::open_system_audio_access_settings::<tauri::Wry>,
            commands::get_mic_muted::<tauri::Wry>,
            commands::set_mic_muted::<tauri::Wry>,
            commands::get_speaker_muted::<tauri::Wry>,
            commands::set_speaker_muted::<tauri::Wry>,
            commands::subscribe::<tauri::Wry>,
            commands::unsubscribe::<tauri::Wry>,
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
            .plugin(tauri_plugin_local_stt::init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[tokio::test]
    async fn test_listener() {
        let _ = create_app(tauri::test::mock_builder());
    }
}
