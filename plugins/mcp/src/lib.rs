use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod error;
mod ext;
mod store;

pub use error::*;
pub use ext::*;
pub use store::*;

const PLUGIN_NAME: &str = "mcp";

pub type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_servers::<tauri::Wry>,
            commands::set_servers::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let state = SharedState::default();
            app.manage(state);

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
        builder
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[tokio::test]
    async fn test_mcp() {
        let app = create_app(tauri::test::mock_builder());

        {
            use crate::McpPluginExt;
            assert_eq!(app.handle().get_servers().unwrap(), vec![]);
            let servers = vec![crate::McpServer {
                r#type: "sse".to_string(),
                enabled: true,
                url: "http://localhost:1420".to_string(),
                header_key: None,
                header_value: None,
            }];
            app.handle().set_servers(servers.clone()).unwrap();
            assert_eq!(app.handle().get_servers().unwrap(), servers);
        }
    }
}
