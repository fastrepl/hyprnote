use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod dnd;
mod error;
mod events;
mod ext;
mod handler;

pub use dnd::*;
pub use error::*;
pub use events::*;
pub use ext::*;

const PLUGIN_NAME: &str = "detect";

pub type SharedState = Mutex<State>;

pub struct State {
    #[allow(dead_code)]
    pub(crate) detector: hypr_detect::Detector,
    pub(crate) ignored_bundle_ids: Vec<String>,
    pub(crate) respect_do_not_disturb: bool,
}

impl Default for State {
    fn default() -> Self {
        Self {
            detector: hypr_detect::Detector::default(),
            ignored_bundle_ids: vec![],
            respect_do_not_disturb: false,
        }
    }
}
fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::set_quit_handler::<tauri::Wry>,
            commands::reset_quit_handler::<tauri::Wry>,
            commands::list_installed_applications::<tauri::Wry>,
            commands::list_mic_using_applications::<tauri::Wry>,
            commands::set_respect_do_not_disturb::<tauri::Wry>,
            commands::set_ignored_bundle_ids::<tauri::Wry>,
            commands::list_default_ignored_bundle_ids::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![DetectEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
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
