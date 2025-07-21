use std::sync::Mutex;
use tauri::Manager;

mod automation;
mod commands;
mod config;
mod error;
mod ext;
mod storage;

pub use error::{Error, Result};
pub use ext::MeetingAutomationPluginExt;
pub use storage::ConfigManager;

pub type ManagedState<R> = Mutex<State<R>>;

pub struct State<R: tauri::Runtime> {
    pub automation: Option<crate::automation::MeetingAutomation<R>>,
    pub config_manager: Option<ConfigManager<R>>,
}

impl<R: tauri::Runtime> Default for State<R> {
    fn default() -> Self {
        Self {
            automation: None,
            config_manager: None,
        }
    }
}

const PLUGIN_NAME: &str = "meeting-automation";

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::start_meeting_automation,
            commands::stop_meeting_automation,
            commands::get_automation_status,
            commands::configure_automation,
            commands::get_automation_config,
            commands::test_meeting_detection,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let config_manager = ConfigManager::new(app.clone())
                .map_err(|e| format!("Failed to initialize config manager: {}", e))?;

            let mut state = State::default();
            state.config_manager = Some(config_manager);

            app.manage(ManagedState::new(state));
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
            .plugin_name(PLUGIN_NAME)
            .commands(tauri_specta::collect_commands![
                commands::start_meeting_automation,
                commands::stop_meeting_automation,
                commands::get_automation_status,
                commands::configure_automation,
                commands::get_automation_config,
                commands::test_meeting_detection,
            ])
            .error_handling(tauri_specta::ErrorHandlingMode::Throw);

        let result = specta_builder.export(
            specta_typescript::Typescript::default()
                .header("// @ts-nocheck\n\n")
                .formatter(specta_typescript::formatter::prettier)
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "./js/bindings.gen.ts",
        );
        assert!(result.is_ok(), "Failed to export TypeScript types");
    }
}
