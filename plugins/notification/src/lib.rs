use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod detect;
mod error;
mod event;
mod ext;
mod handler;
mod store;

pub use error::*;
pub use ext::*;
pub use store::*;

const PLUGIN_NAME: &str = "notification";

pub type SharedState = Mutex<State>;

pub struct State {
    worker_handle: Option<tokio::task::JoinHandle<()>>,
    detect_state: detect::DetectState,
    notification_handler: handler::NotificationHandler,
}

impl State {
    pub fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Self {
        let notification_handler = handler::NotificationHandler::new(app_handle.clone());
        let detect_state = detect::DetectState::new(&notification_handler);

        Self {
            worker_handle: None,
            detect_state,
            notification_handler,
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
            Ok(())
        })
        .on_event(|app, event| match event {
            tauri::RunEvent::Ready => {
                if app.get_detect_notification().unwrap_or(false) {
                    match app.start_detect_notification() {
                        Ok(_) => tracing::info!("detect_notification_start_success"),
                        Err(_) => tracing::error!("detect_notification_start_failed"),
                    }
                }

                if app.get_event_notification().unwrap_or(false) {
                    let app_clone = app.clone();
                    tokio::spawn(async move {
                        match app_clone.start_event_notification().await {
                            Ok(_) => tracing::info!("event_notification_start_success"),
                            Err(_) => tracing::error!("event_notification_start_failed"),
                        }
                    });
                }
            }
            _ => {}
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
