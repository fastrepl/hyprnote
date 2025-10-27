use std::str::FromStr;
use std::sync::{Arc, Mutex, RwLock};
use tauri::Manager;

mod commands;
mod detect;
mod error;
mod event;
mod ext;
mod handler;
mod quit;

pub use error::*;
pub use ext::*;
pub use quit::*;

const PLUGIN_NAME: &str = "notification";

pub type SharedState = Mutex<State>;

#[derive(Debug, Clone, Default)]
pub struct NotificationConfig {
    pub respect_do_not_disturb: bool,
    pub ignored_platforms: Vec<String>,
}

pub struct State {
    worker_handle: Option<tokio::task::JoinHandle<()>>,
    detect_state: detect::DetectState,
    notification_handler: handler::NotificationHandler,
    analytics_task: Option<tokio::task::JoinHandle<()>>,
    config: Arc<RwLock<NotificationConfig>>,
}

impl State {
    pub fn new(app_handle: tauri::AppHandle<tauri::Wry>) -> Self {
        let config = Arc::new(RwLock::new(NotificationConfig::default()));
        let notification_handler =
            handler::NotificationHandler::new(app_handle.clone(), config.clone());
        let detect_state = detect::DetectState::new(&notification_handler);

        Self {
            worker_handle: None,
            detect_state,
            notification_handler,
            analytics_task: None,
            config,
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_applications::<tauri::Wry>,
            commands::show_notification::<tauri::Wry>,
            commands::start_detect_notification::<tauri::Wry>,
            commands::stop_detect_notification::<tauri::Wry>,
            commands::start_event_notification::<tauri::Wry>,
            commands::stop_event_notification::<tauri::Wry>,
        ])
        .typ::<commands::DetectNotificationParams>()
        .typ::<commands::EventNotificationParams>()
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
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
            tauri::RunEvent::MainEventsCleared => {}
            tauri::RunEvent::Ready => {}
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                if let Ok(tauri_plugin_windows::AppWindow::Main) =
                    tauri_plugin_windows::AppWindow::from_str(label.as_ref())
                {
                    if let tauri::WindowEvent::Focused(true) = event {
                        app.clear_notifications().unwrap();
                    }
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
