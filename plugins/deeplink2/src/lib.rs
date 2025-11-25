mod commands;
mod error;
mod ext;
mod types;

pub use error::{Error, Result};
pub use ext::*;
pub use types::*;

const PLUGIN_NAME: &str = "deeplink2";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::ping::<tauri::Wry>,
            commands::get_available_deep_links::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![events::DeepLinkEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|_app, _api| Ok(()))
        .build()
}

pub mod events {
    #[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
    pub struct DeepLinkEvent(pub crate::DeepLink);
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
