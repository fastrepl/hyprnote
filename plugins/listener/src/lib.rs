use statig::awaitable::IntoStateMachineExt;
use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod error;
mod events;
mod ext;
pub mod fsm;
mod manager;

pub use error::*;
pub use events::*;
pub use ext::*;

const PLUGIN_NAME: &str = "listener";

pub type SharedState = Mutex<State>;

pub struct State {
    fsm: statig::awaitable::StateMachine<fsm::Session>,
    _device_monitor_handle: Option<hypr_audio::DeviceMonitorHandle>,
}

impl State {
    pub fn get_state(&self) -> fsm::State {
        self.fsm.state().clone()
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_microphone_devices::<tauri::Wry>,
            commands::get_current_microphone_device::<tauri::Wry>,
            commands::set_microphone_device::<tauri::Wry>,
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

            let device_monitor_handle = {
                let (event_tx, event_rx) = std::sync::mpsc::channel();
                let device_monitor_handle = hypr_audio::DeviceMonitor::spawn(event_tx);

                let app_handle = handle.clone();
                std::thread::spawn(move || {
                    while let Ok(event) = event_rx.recv() {
                        if let hypr_audio::DeviceEvent::DefaultInputChanged = event {
                            let new_device = hypr_audio::AudioInput::get_default_mic_device_name();

                            let app_handle_clone = app_handle.clone();
                            let device_name = new_device.clone();

                            app_handle_clone
                                .run_on_main_thread({
                                    let app_handle_inner = app_handle_clone.clone();
                                    let device_name_inner = device_name.clone();
                                    move || {
                                        tauri::async_runtime::spawn(async move {
                                            if let Some(state) =
                                                app_handle_inner.try_state::<SharedState>()
                                            {
                                                let mut guard = state.lock().await;
                                                let event = fsm::StateEvent::MicChange(Some(
                                                    device_name_inner,
                                                ));
                                                guard.fsm.handle(&event).await;
                                            }
                                        });
                                    }
                                })
                                .ok();
                        }
                    }
                });

                device_monitor_handle
            };

            let state: SharedState = Mutex::new(State {
                fsm,
                _device_monitor_handle: Some(device_monitor_handle),
            });

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
