use tauri::{Manager, Wry};
use tokio::sync::Mutex;

mod commands;
mod error;
mod inference;
mod server;

pub use error::{Error, Result};

const PLUGIN_NAME: &str = "llm";

#[derive(Default)]
pub struct State {
    pub loaded: bool,
    pub api_base: Option<String>,
}

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![commands::ping::<Wry>])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(Mutex::new(State::default()));
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
                "./generated/bindings.ts",
            )
            .unwrap()
    }
}
