mod audio;
mod auth;
mod commands;
mod permissions;
mod store;
mod tray;
mod vault;
mod windows;
mod workers;

use tauri::Manager;

pub struct App {
    handle: tauri::AppHandle,
    bridge: hypr_bridge::Client,
    user_id: String,
    vault: vault::Vault,
}

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    {
        tracing_subscriber::fmt()
            .with_file(true)
            .with_line_number(true)
            .with_timer(tracing_subscriber::fmt::time::ChronoLocal::rfc_3339())
            .with_env_filter(
                tracing_subscriber::EnvFilter::builder()
                    .with_default_directive(tracing::Level::DEBUG.into())
                    .from_env_lossy(),
            )
            .init();
    }

    let client = tauri_plugin_sentry::sentry::init((
        option_env!("SENTRY_DSN").unwrap_or_default(),
        tauri_plugin_sentry::sentry::ClientOptions {
            release: tauri_plugin_sentry::sentry::release_name!(),
            auto_session_tracking: true,
            ..Default::default()
        },
    ));

    let _guard = tauri_plugin_sentry::minidump::init(&client);

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_listener::init())
        .plugin(tauri_plugin_db::init())
        .plugin(tauri_plugin_template::init())
        .plugin(tauri_plugin_llm::init())
        .plugin(tauri_plugin_sentry::init(&client))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            windows::ShowHyprWindow::MainWithoutDemo.show(app).unwrap();
        }));

    let specta_builder = make_specta_builder();

    builder
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            let app = app.handle().clone();

            specta_builder.mount_events(&app);
            store::UserStore::load(&app).unwrap();

            let user_id = {
                use tauri_plugin_db::DatabaseExtentionExt;

                if let Some(user_id) = store::UserStore::get(&app).unwrap().user_id {
                    app.db_set_user_id(user_id.clone()).unwrap();
                    user_id
                } else {
                    let user_id = app.db_create_new_user().unwrap();
                    user_id
                }
            };

            let identifier = app.config().identifier.clone();
            let vault = vault::Vault::new(identifier);

            let server_api_base = if cfg!(debug_assertions) {
                "http://localhost:1234".to_string()
            } else {
                "https://app.hyprnote.com".to_string()
            };

            let server_api_key = vault
                .get(vault::Key::RemoteServer)
                .unwrap_or("123".to_string());

            {
                let bridge = hypr_bridge::Client::builder()
                    .api_base(server_api_base)
                    .api_key(server_api_key)
                    .build()
                    .unwrap();

                app.manage(App {
                    user_id: user_id.clone(),
                    handle: app.clone(),
                    bridge: bridge.clone(),
                    vault,
                });
            }

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                autostart_manager.enable().unwrap();
            }

            // tokio::spawn(async move {
            //     let state = workers::WorkerState {
            //         db,
            //         user_id: user_id.clone(),
            //     };
            //     workers::monitor(state).await.unwrap();
            // });

            tray::create_tray(&app).unwrap();
            windows::ShowHyprWindow::MainWithoutDemo.show(&app).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            commands::get_user_id,
            commands::run_enhance,
            commands::list_builtin_templates,
            permissions::open_permission_settings,
            permissions::check_permission_status,
            auth::commands::start_oauth_server,
            auth::commands::cancel_oauth_server,
            auth::commands::is_authenticated,
            windows::commands::show_window,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder()
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
