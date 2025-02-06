mod audio;
mod auth;
mod commands;
mod db;
mod error;
mod events;
mod permissions;
mod session;
mod tray;
mod vars;
mod windows;
mod workers;

use tauri::Manager;

pub struct App {
    handle: tauri::AppHandle,
    db: hypr_db::user::UserDatabase,
    bridge: hypr_bridge::Client,
}

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    #[cfg(debug_assertions)]
    {
        tracing_subscriber::fmt()
            .with_file(true)
            .with_line_number(true)
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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            windows::ShowHyprWindow::MainWithoutDemo.show(app).unwrap();
        }));

    let specta_builder = tauri_specta::Builder::new()
        .commands(tauri_specta::collect_commands![
            commands::run_enhance,
            commands::list_builtin_templates,
            permissions::open_permission_settings,
            permissions::check_permission_status,
            session::commands::start_session,
            session::commands::stop_session,
            windows::commands::show_window,
            db::commands::upsert_session,
            db::commands::upsert_calendar,
            db::commands::list_calendars,
            db::commands::list_events,
            db::commands::list_sessions,
            db::commands::list_participants,
            db::commands::upsert_participant,
            db::commands::get_session,
            db::commands::set_session_event,
            db::commands::list_templates,
            db::commands::upsert_template,
            db::commands::delete_template,
            db::commands::get_config,
            db::commands::set_config,
        ])
        .events(tauri_specta::collect_events![
            events::RecordingStarted,
            events::RecordingStopped,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            specta_typescript::Typescript::default()
                .header("// @ts-nocheck\n\n")
                .formatter(specta_typescript::formatter::prettier)
                .bigint(specta_typescript::BigIntExportBehavior::BigInt),
            "../src/types/tauri.gen.ts",
        )
        .unwrap();

    let db = {
        let conn = {
            #[cfg(debug_assertions)]
            {
                hypr_db::ConnectionBuilder::new()
                    .local(":memory:")
                    .connect()
                    .await
                    .unwrap()
            }

            #[cfg(not(debug_assertions))]
            {
                hypr_db::ConnectionBuilder::new()
                    .local(":memory:")
                    .connect()
                    .await
                    .unwrap()
            }
        };

        hypr_db::user::migrate(&conn).await.unwrap();
        let db = hypr_db::user::UserDatabase::from(conn);

        #[cfg(debug_assertions)]
        {
            hypr_db::user::seed(&db).await.unwrap();
        }

        db
    };

    builder
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            let app = app.handle().clone();
            specta_builder.mount_events(&app);

            {
                let bridge = hypr_bridge::Client::builder()
                    .api_base(vars::server_api_base())
                    .api_key(vars::server_api_key())
                    .build()
                    .unwrap();

                app.manage(App {
                    handle: app.clone(),
                    db: db.clone(),
                    bridge: bridge.clone(),
                });

                app.manage(tokio::sync::Mutex::new(
                    session::SessionState::new().unwrap(),
                ));
            }

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                let _ = autostart_manager.enable().unwrap();
            }

            let worker_app = app.clone();
            let worker_db = db.clone();

            tokio::spawn(async move {
                let state = workers::WorkerState {
                    db: worker_db,
                    app: worker_app,
                };
                let _m = workers::monitor(state).await.unwrap();
            });

            tray::create_tray(&app).unwrap();
            windows::ShowHyprWindow::MainWithoutDemo.show(&app).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
