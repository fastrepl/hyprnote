mod audio;
mod commands;
mod error;
mod ext;
mod folder;
mod frontmatter;
mod json;
mod migration;
mod scan;
mod types;

pub use types::*;

pub use error::{Error, Result};
pub use ext::*;
pub use folder::{find_session_dir, is_uuid};

const PLUGIN_NAME: &str = "fs-sync";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::deserialize,
            commands::write_json_batch,
            commands::write_markdown_batch,
            commands::write_frontmatter_batch,
            commands::read_frontmatter_batch,
            commands::list_folders::<tauri::Wry>,
            commands::move_session::<tauri::Wry>,
            commands::create_folder::<tauri::Wry>,
            commands::rename_folder::<tauri::Wry>,
            commands::delete_folder::<tauri::Wry>,
            commands::cleanup_orphan_files::<tauri::Wry>,
            commands::cleanup_orphan_dirs::<tauri::Wry>,
            commands::audio_exist::<tauri::Wry>,
            commands::audio_delete::<tauri::Wry>,
            commands::audio_import::<tauri::Wry>,
            commands::audio_path::<tauri::Wry>,
            commands::session_dir::<tauri::Wry>,
            commands::delete_session_folder::<tauri::Wry>,
            commands::scan_and_read,
            commands::chat_dir::<tauri::Wry>,
            commands::entity_dir::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            use tauri_plugin_path2::Path2PluginExt;
            let base = app.path2().base().unwrap();
            migration::run(&base);
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap();

        let content = std::fs::read_to_string(OUTPUT_FILE).unwrap();
        std::fs::write(OUTPUT_FILE, format!("// @ts-nocheck\n{content}")).unwrap();
    }
}
