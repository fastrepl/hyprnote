use tauri::Manager;
use tokio::sync::Mutex;

mod actors;
mod commands;
mod error;
mod events;
mod ext;
pub mod fsm;

pub use error::*;
pub use events::*;
pub use ext::*;

const PLUGIN_NAME: &str = "listener";

pub type SharedState = std::sync::Arc<Mutex<State>>;

pub struct State {
    pub app: tauri::AppHandle,
    pub session_supervisor: Option<ractor::ActorCell>,
    pub supervisor_handle: Option<tokio::task::JoinHandle<()>>,
}

impl State {
    pub fn get_state(&self) -> fsm::State {
        if self.session_supervisor.is_some() {
            crate::fsm::State::RunningActive
        } else {
            crate::fsm::State::Inactive
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_microphone_devices::<tauri::Wry>,
            commands::get_current_microphone_device::<tauri::Wry>,
            commands::get_mic_muted::<tauri::Wry>,
            commands::set_mic_muted::<tauri::Wry>,
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
            commands::get_state::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![SessionEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let app_handle = app.app_handle().clone();

            let state: SharedState = std::sync::Arc::new(Mutex::new(State {
                app: app_handle,
                session_supervisor: None,
                supervisor_handle: None,
            }));

            app.manage(state);

            Ok(())
        })
        .on_event(move |app, event| {
            if let tauri::RunEvent::Ready = event {
                let app_handle = app.clone();
                hypr_intercept::register_quit_handler(PLUGIN_NAME, move || {
                    let state = app_handle.state::<SharedState>();
                    match state.try_lock() {
                        Ok(guard) => guard.session_supervisor.is_none(),
                        Err(_) => false,
                    }
                });
            }
        })
        .on_drop(|_app| {
            hypr_intercept::unregister_quit_handler(PLUGIN_NAME);
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap();

        let content = std::fs::read_to_string(OUTPUT_FILE).unwrap();
        std::fs::write(OUTPUT_FILE, format!("// @ts-nocheck\n{content}")).unwrap();
    }
}
