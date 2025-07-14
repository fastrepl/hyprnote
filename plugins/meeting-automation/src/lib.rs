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

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::start_meeting_automation::<tauri::Wry>,
            commands::stop_meeting_automation::<tauri::Wry>,
            commands::get_automation_status::<tauri::Wry>,
            commands::configure_automation::<tauri::Wry>,
            commands::get_automation_config::<tauri::Wry>,
            commands::test_meeting_detection::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

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
