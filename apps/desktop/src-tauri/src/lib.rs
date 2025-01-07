mod audio;
mod auth;
mod commands;
mod config;
mod events;
mod permissions;
mod session;
mod tray;
mod windows;
mod workers;

use std::str::FromStr;
use tauri::{AppHandle, Manager, WindowEvent};
use windows::{HyprWindowId, ShowHyprWindow};

pub struct App {
    handle: AppHandle,
    cloud_config: hypr_bridge::ClientConfig,
    db: hypr_db::user::UserDatabase,
}

pub struct SessionState {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let specta_builder = tauri_specta::Builder::new()
        .commands(tauri_specta::collect_commands![
            commands::get_env,
            commands::get_fingerprint,
            commands::start_session,
            commands::start_playback,
            commands::stop_playback,
            commands::show_window,
            commands::create_session,
            permissions::open_permission_settings,
            commands::db::db_list_calendars,
            commands::db::db_list_events,
            commands::db::db_list_sessions,
            commands::db::db_list_participants,
            commands::db::db_upsert_participant,
            commands::db::db_get_session,
            commands::db::db_create_session,
        ])
        .events(tauri_specta::collect_events![
            events::TranscriptEvent,
            events::RecordingStarted,
            events::RecordingStopped,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            specta_typescript::Typescript::default()
                .header("// @ts-nocheck\n\n")
                .formatter(specta_typescript::formatter::prettier),
            "../src/types/tauri.ts",
        )
        .unwrap();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init());

    // https://v2.tauri.app/plugin/single-instance/#focusing-on-new-instance
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            ShowHyprWindow::MainWithoutDemo.show(app).unwrap();
        }));
    }

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        );
    }

    // https://v2.tauri.app/plugin/positioner/#setup
    builder = builder.setup(|app| {
        let _ = app.handle().plugin(tauri_plugin_positioner::init());
        tauri::tray::TrayIconBuilder::new()
            .on_tray_icon_event(|tray_handle, event| {
                tauri_plugin_positioner::on_tray_event(tray_handle.app_handle(), &event);
            })
            .build(app)?;
        Ok(())
    });

    let db = tauri::async_runtime::block_on(async {
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
        hypr_db::user::seed(&db).await.unwrap();

        db
    });

    builder
        .on_window_event(|window, event| {
            let label = window.label();
            let app = window.app_handle();

            match event {
                WindowEvent::Destroyed => {
                    if let Ok(window_id) = HyprWindowId::from_str(label) {
                        match window_id {
                            HyprWindowId::Main => {
                                if let Some(w) = HyprWindowId::Demo.get(app) {
                                    w.close().ok();
                                }
                            }
                            HyprWindowId::Demo => {
                                ShowHyprWindow::MainWithoutDemo.show(app).unwrap();
                            }
                        };
                    }
                }
                _ => {}
            }
        })
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            specta_builder.mount_events(app);
            Ok(())
        })
        .setup(|app| {
            #[cfg(desktop)]
            let _ = app
                .handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build());

            Ok(())
        })
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::ManagerExt;

                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec![]),
                ));

                let autostart_manager = app.autolaunch();
                let _ = autostart_manager.enable();
            }
            Ok(())
        })
        .setup(|app| {
            let app = app.handle().clone();

            tray::create_tray(&app).unwrap();

            ShowHyprWindow::MainWithoutDemo.show(&app).unwrap();

            let mut cloud_config = hypr_bridge::ClientConfig {
                base_url: if cfg!(debug_assertions) {
                    "http://localhost:4000".parse().unwrap()
                } else {
                    "https://server.hyprnote.com".parse().unwrap()
                },
                auth_token: None,
            };

            if let Ok(Some(auth)) = auth::AuthStore::load(&app) {
                cloud_config.auth_token = Some(auth.token);
            }

            app.manage(App {
                handle: app.clone(),
                cloud_config,
                db,
            });

            app.manage(tokio::sync::Mutex::new(SessionState {}));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
