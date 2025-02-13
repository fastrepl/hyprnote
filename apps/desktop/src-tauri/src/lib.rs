mod audio;
mod auth;
mod commands;
mod db;
mod permissions;
mod session;
mod store;
mod tray;
mod vault;
mod windows;
mod workers;

use tauri::Manager;

pub struct App {
    handle: tauri::AppHandle,
    db: hypr_db::user::UserDatabase,
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

    let specta_builder = tauri_specta::Builder::new()
        .commands(tauri_specta::collect_commands![
            commands::get_user_id,
            commands::run_enhance,
            commands::list_builtin_templates,
            permissions::open_permission_settings,
            permissions::check_permission_status,
            session::commands::start_session,
            session::commands::stop_session,
            session::commands::get_timeline,
            auth::commands::start_oauth_server,
            auth::commands::cancel_oauth_server,
            auth::commands::is_authenticated,
            windows::commands::show_window,
            db::commands::upsert_session,
            db::commands::upsert_calendar,
            db::commands::list_calendars,
            db::commands::list_events,
            db::commands::list_sessions,
            db::commands::get_session,
            db::commands::set_session_event,
            db::commands::list_templates,
            db::commands::upsert_template,
            db::commands::delete_template,
            db::commands::get_config,
            db::commands::set_config,
            db::commands::upsert_human,
            db::commands::get_self_human,
            db::commands::get_self_organization,
            db::commands::upsert_organization,
            db::commands::list_participants,
            db::commands::list_chat_groups,
            db::commands::list_chat_messages,
            db::commands::create_chat_group,
            db::commands::upsert_chat_message,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            specta_typescript::Typescript::default()
                .header("// @ts-nocheck\n\n")
                .formatter(specta_typescript::formatter::prettier)
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/types/tauri.gen.ts",
        )
        .unwrap();

    builder
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            let app = app.handle().clone();

            specta_builder.mount_events(&app);
            store::UserStore::load(&app).unwrap();

            let user_id = "human_id".to_string();

            let vault = vault::Vault::new();
            let vault_for_db = vault.clone();

            let db = tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async move {
                    #[allow(unused)]
                    let vault = vault_for_db;

                    let conn = {
                        #[cfg(debug_assertions)]
                        {
                            hypr_db::ConnectionBuilder::default()
                                .local(":memory:")
                                .connect()
                                .await
                                .unwrap()
                        }

                        #[cfg(not(debug_assertions))]
                        {
                            if let Ok(token) = vault.get(vault::Key::RemoteDatabase) {
                                hypr_db::ConnectionBuilder::default()
                                    .remote("TODO", token)
                                    .connect()
                                    .await
                                    .unwrap()
                            } else {
                                hypr_db::ConnectionBuilder::default()
                                    .local(":memory:")
                                    .connect()
                                    .await
                                    .unwrap()
                            }
                        }
                    };

                    hypr_db::user::migrate(&conn).await.unwrap();
                    let db = hypr_db::user::UserDatabase::from(conn);

                    #[cfg(debug_assertions)]
                    {
                        hypr_db::user::seed(&db).await.unwrap();
                    }

                    db
                })
            });

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
                    db: db.clone(),
                    bridge: bridge.clone(),
                    vault,
                });

                app.manage(tokio::sync::Mutex::new(
                    session::SessionState::new().unwrap(),
                ));
            }

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                autostart_manager.enable().unwrap();
            }

            tokio::spawn(async move {
                let state = workers::WorkerState {
                    db,
                    user_id: user_id.clone(),
                };
                workers::monitor(state).await.unwrap();
            });

            tray::create_tray(&app).unwrap();
            windows::ShowHyprWindow::MainWithoutDemo.show(&app).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
