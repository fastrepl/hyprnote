use statig::awaitable::IntoStateMachineExt;
use tauri::Manager;
use tokio::sync::Mutex;

mod client;
mod commands;
mod error;
mod events;
mod ext;
mod fsm;

pub use client::*;
pub use error::*;
pub use events::*;
pub use ext::ListenerPluginExt;
pub use fsm::StateEvent;

pub use hypr_listener_interface::*;

const PLUGIN_NAME: &str = "listener";

pub type SharedState = Mutex<State>;

pub struct State {
    pub fsm: statig::awaitable::StateMachine<fsm::Session>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_microphone_devices::<tauri::Wry>,
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
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
            commands::pause_session::<tauri::Wry>,
            commands::resume_session::<tauri::Wry>,
            commands::get_state::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![SessionEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let handle = app.app_handle();
            let fsm = fsm::Session::new(handle.clone()).state_machine();
            let state: SharedState = Mutex::new(State { fsm });
            app.manage(state);
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
}
