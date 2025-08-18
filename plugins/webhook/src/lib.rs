mod commands;
mod error;
mod ext;
mod openapi;

pub use error::*;
pub use ext::*;
pub use openapi::*;

const PLUGIN_NAME: &str = "webhook";

use tauri::Manager;

#[derive(Default)]
pub struct State {}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .events(tauri_specta::collect_events![])
        .commands(tauri_specta::collect_commands![
            commands::todo::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            {
                app.manage(State::default());
            }

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

    #[test]
    fn export_openapi() {
        let openapi_json = generate_openapi_json();
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("openapi.json");
        std::fs::write(&path, openapi_json).unwrap();
    }
}
