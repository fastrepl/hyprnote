use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod detect;
mod error;
mod event;
mod ext;
mod store;

pub use error::*;
pub use ext::*;
pub use store::*;

const PLUGIN_NAME: &str = "notification";

pub type SharedState = Mutex<State>;

pub struct State {
    worker_handle: Option<tokio::task::JoinHandle<()>>,
    detect_state: detect::DetectState,
}

impl State {
    pub fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Self {
        Self {
            worker_handle: None,
            detect_state: detect::DetectState::new(app_handle),
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::show_notification::<tauri::Wry>,
            commands::get_event_notification::<tauri::Wry>,
            commands::set_event_notification::<tauri::Wry>,
            commands::get_detect_notification::<tauri::Wry>,
            commands::set_detect_notification::<tauri::Wry>,
            commands::start_detect_notification::<tauri::Wry>,
            commands::stop_detect_notification::<tauri::Wry>,
            commands::start_event_notification::<tauri::Wry>,
            commands::stop_event_notification::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let state = State::new(app.clone());
            app.manage(Mutex::new(state));

            // TODO: we cannot start event_notic here. maybe in `.event()`callback?
            // detector can though

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

    fn create_app(builder: tauri::Builder<tauri::Wry>) -> tauri::App<tauri::Wry> {
        builder
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }
}
