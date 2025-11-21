mod commands;
mod error;
mod ext;
mod handler;

pub use error::{Error, Result};
pub use ext::*;

const PLUGIN_NAME: &str = "cli2";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::install_cli::<tauri::Wry>,
            commands::uninstall_cli::<tauri::Wry>,
            commands::check_cli_status::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let matches = {
                use tauri_plugin_cli::CliExt;
                app.cli().matches()
            };

            match matches {
                Ok(matches) => handler::entrypoint(app, matches),
                Err(error) => tracing::error!("cli_matches_error: {error}"),
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
