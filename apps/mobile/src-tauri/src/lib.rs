mod commands;
mod errors;
mod ext;

use errors::*;
use ext::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::INFO)
            .init();
    }

    let specta_builder = make_specta_builder();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_auth::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_misc::init())
        .plugin(tauri_plugin_db::init())
        .plugin(tauri_plugin_template::init())
        .plugin(tauri_plugin_store2::init());

    builder
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            let app = app.handle().clone();

            specta_builder.mount_events(&app);

            tauri::async_runtime::block_on(async move {
                app.setup_db().await.unwrap();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap();
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .commands(tauri_specta::collect_commands![
            commands::setup_db::<tauri::Wry>
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
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
                "../src/types/tauri.gen.ts",
            )
            .unwrap()
    }
}
