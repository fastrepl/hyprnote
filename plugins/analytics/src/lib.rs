use tauri::Manager;

mod commands;
mod error;
mod ext;
mod store;

pub use error::{Error, Result};
pub use ext::*;
use store::*;

pub use hypr_analytics;

const PLUGIN_NAME: &str = "analytics";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::event::<tauri::Wry>,
            commands::set_disabled::<tauri::Wry>,
            commands::is_disabled::<tauri::Wry>,
            commands::get_queue_size::<tauri::Wry>,
            commands::flush_queue::<tauri::Wry>,
            commands::clear_queue::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let api_key = {
                #[cfg(not(debug_assertions))]
                {
                    env!("POSTHOG_API_KEY")
                }

                #[cfg(debug_assertions)]
                {
                    option_env!("POSTHOG_API_KEY").unwrap_or_default()
                }
            };

            let client = hypr_analytics::AnalyticsClient::new(api_key);
            assert!(app.manage(client));
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

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        let mut ctx = tauri::test::mock_context(tauri::test::noop_assets());
        ctx.config_mut().identifier = "com.hyprnote.dev".to_string();
        ctx.config_mut().version = Some("0.0.1".to_string());

        builder.plugin(init()).build(ctx).unwrap()
    }

    #[test]
    fn test_analytics() {
        let app = create_app(tauri::test::mock_builder());

        {
            use tauri_plugin_misc::MiscPluginExt;
            let git_hash = app.get_git_hash();
            println!("git_hash: {}", git_hash);
        }

        {
            let version = app.config().version.clone();
            println!("version: {}", version.unwrap_or_default());
        }

        {
            let bundle_id = app.config().identifier.clone();
            println!("bundle_id: {}", bundle_id);
        }
    }
}
