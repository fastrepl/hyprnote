use std::collections::HashMap;

use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod dnd;
mod error;
mod events;
mod ext;
mod handler;
mod policy;

pub use dnd::*;
pub use error::*;
pub use events::*;
pub use ext::*;
pub use policy::*;

const PLUGIN_NAME: &str = "detect";

pub type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    #[allow(dead_code)]
    pub(crate) detector: hypr_detect::Detector,
    pub(crate) policy: policy::MicNotificationPolicy,
    pub(crate) mic_usage_timers: HashMap<String, tokio::task::JoinHandle<()>>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_installed_applications::<tauri::Wry>,
            commands::list_mic_using_applications::<tauri::Wry>,
            commands::set_respect_do_not_disturb::<tauri::Wry>,
            commands::set_ignored_bundle_ids::<tauri::Wry>,
            commands::list_default_ignored_bundle_ids::<tauri::Wry>,
            commands::get_preferred_languages::<tauri::Wry>,
            commands::get_current_locale_identifier::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![DetectEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let state = SharedState::default();
            app.manage(state);

            let app_handle = app.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                handler::setup(&app_handle).await.unwrap();
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

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[test]
    fn test_detect() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
