use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod error;
mod events;
mod ext;

pub use error::*;
pub use events::*;
pub use ext::*;

const PLUGIN_NAME: &str = "detect";

pub type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::start_detection::<tauri::Wry>,
            commands::stop_detection::<tauri::Wry>,
            commands::list_installed_applications::<tauri::Wry>,
            commands::list_mic_using_applications::<tauri::Wry>,
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

            let _app_handle = app.app_handle().clone();
            let state = State::default();

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
