use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

mod commands;

const PLUGIN_NAME: &str = "template";

fn make_specta_builder<R: Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![commands::render])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
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
                "./generated/bindings.ts",
            )
            .unwrap()
    }
}
