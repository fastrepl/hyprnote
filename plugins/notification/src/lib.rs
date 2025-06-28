use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod error;
mod ext;
mod meeting_detection;
mod store;
mod worker;

pub use error::*;
pub use ext::*;
pub use store::*;

const PLUGIN_NAME: &str = "notification";

pub type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    worker_handle: Option<tokio::task::JoinHandle<()>>,
    detector: hypr_detect::Detector,
    meeting_detector: crate::meeting_detection::MeetingDetector,
}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_event_notification::<tauri::Wry>,
            commands::set_event_notification::<tauri::Wry>,
            commands::get_detect_notification::<tauri::Wry>,
            commands::set_detect_notification::<tauri::Wry>,
            commands::open_notification_settings::<tauri::Wry>,
            commands::request_notification_permission::<tauri::Wry>,
            commands::check_notification_permission::<tauri::Wry>,
            commands::start_detect_notification::<tauri::Wry>,
            commands::stop_detect_notification::<tauri::Wry>,
            commands::start_event_notification::<tauri::Wry>,
            commands::stop_event_notification::<tauri::Wry>,
            commands::get_auto_record_enabled::<tauri::Wry>,
            commands::set_auto_record_enabled::<tauri::Wry>,
            commands::get_auto_record_threshold::<tauri::Wry>,
            commands::set_auto_record_threshold::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let state = SharedState::default();
            app.manage(state);

            // Defer initialization that depends on the plugin being fully set up
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                // Small delay to ensure plugin is fully initialized
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                // Configure the meeting detector with the app handle
                if let Some(state) = app_handle.try_state::<SharedState>() {
                    let state_guard = state.lock().unwrap();
                    state_guard
                        .meeting_detector
                        .set_app_handle(app_handle.clone());

                    // Set initial auto-record configuration from stored settings
                    let auto_enabled = app_handle.get_auto_record_enabled().unwrap_or(false);
                    let auto_threshold = app_handle.get_auto_record_threshold().unwrap_or(0.7);
                    if let Err(e) = state_guard
                        .meeting_detector
                        .set_auto_record_config(auto_enabled, auto_threshold)
                    {
                        tracing::error!("failed_to_set_initial_auto_record_config: {}", e);
                    }
                }

                if app_handle.get_detect_notification().unwrap_or(false) {
                    if let Err(e) = app_handle.start_detect_notification() {
                        tracing::error!("start_detect_notification_failed: {:?}", e);
                    }
                }

                if app_handle.get_event_notification().unwrap_or(false) {
                    if let Err(e) = app_handle.start_event_notification().await {
                        tracing::error!("start_event_notification_failed: {:?}", e);
                    }
                }
            });

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

    #[tokio::test]
    async fn test_notification() {
        // Simple test for the notification plugin that doesn't depend on the init function
        let detector = crate::meeting_detection::MeetingDetector::default();

        // Test that the detector can be created and basic functionality works
        assert!(detector.set_auto_record_config(true, 0.5).is_ok());
        assert!(detector.set_auto_record_config(false, 1.5).is_err());
    }
}
