use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Wry,
};

mod commands;
mod error;

pub use error::{Error, Result};

const PLUGIN_NAME: &str = "listener";

fn specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::start_session::<Wry>,
            commands::stop_session
        ])
}
pub fn init() -> TauriPlugin<Wry> {
    let builder = specta_builder();

    Builder::new(PLUGIN_NAME)
        .invoke_handler(builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(tokio::sync::Mutex::new(commands::SessionState::new()?));
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        specta_builder()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./generated/bindings.ts",
            )
            .expect("failed to export specta types");
    }
}
