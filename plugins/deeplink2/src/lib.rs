mod error;
mod types;

#[cfg(test)]
mod docs;

pub use error::{Error, Result};
pub use types::{DeepLink, DeepLinkEvent};

use std::str::FromStr;

use tauri_plugin_deep_link::DeepLinkExt;
use tauri_specta::Event;

const PLUGIN_NAME: &str = "deeplink2";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![])
        .events(tauri_specta::collect_events![types::DeepLinkEvent])
        .typ::<types::DeepLink>()
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let app_handle = app.clone();

            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let url_str = url.as_str();
                    tracing::info!(url = url_str, "deeplink_received");

                    match DeepLink::from_str(url_str) {
                        Ok(deep_link) => {
                            tracing::info!(deep_link = ?deep_link, "deeplink_parsed");
                            if let Err(e) = DeepLinkEvent(deep_link).emit(&app_handle) {
                                tracing::error!(error = ?e, "deeplink_event_emit_failed");
                            }
                        }
                        Err(e) => {
                            tracing::warn!(error = ?e, url = url_str, "deeplink_parse_failed");
                        }
                    }
                }
            });

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export() {
        export_types();
        export_docs();
    }

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

    fn export_docs() {
        let source_code = std::fs::read_to_string("./js/bindings.gen.ts").unwrap();
        let deeplinks = docs::parse_deeplinks(&source_code).unwrap();
        assert!(!deeplinks.is_empty());

        let output_dir = std::path::Path::new("../../apps/web/content/docs/deeplinks");
        std::fs::create_dir_all(output_dir).unwrap();

        for deeplink in &deeplinks {
            let filepath = output_dir.join(deeplink.doc_path());
            let content = deeplink.doc_render();
            std::fs::write(&filepath, content).unwrap();
        }
    }
}
