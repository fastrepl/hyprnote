mod commands;
mod error;
mod ext;

pub use error::*;
pub use ext::*;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

const PLUGIN_NAME: &str = "extensions";

pub struct State {
    pub runtime: hypr_extensions_runtime::ExtensionsRuntime,
}

pub type ManagedState = Arc<Mutex<State>>;

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::load_extension::<tauri::Wry>,
            commands::call_function::<tauri::Wry>,
            commands::execute_code::<tauri::Wry>,
            commands::list_extensions::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let state = State {
                runtime: hypr_extensions_runtime::ExtensionsRuntime::new(),
            };
            app.manage(Arc::new(Mutex::new(state)));
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
