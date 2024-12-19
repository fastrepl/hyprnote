use cap_media::feeds::{AudioInputFeed, AudioInputSamplesSender};
use tokio::sync::RwLock;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

mod audio;
mod auth;
mod commands;
mod config;
mod db;
mod events;
mod permissions;
mod session;

#[derive(specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct App {
    #[serde(skip)]
    handle: AppHandle,
    #[serde(skip)]
    audio_input_feed: Option<AudioInputFeed>,
    #[serde(skip)]
    audio_input_tx: AudioInputSamplesSender,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let specta_builder = tauri_specta::Builder::new()
        .commands(tauri_specta::collect_commands![
            commands::set_config,
            commands::get_config,
            commands::list_audio_devices,
            commands::start_recording,
            commands::stop_recording,
            commands::start_playback,
            commands::stop_playback,
            commands::list_apple_calendars,
            commands::list_apple_events,
            permissions::open_permission_settings,
        ])
        .events(tauri_specta::collect_events![events::Transcript])
        .typ::<hypr_calendar::apple::Calendar>()
        .typ::<hypr_calendar::apple::Event>()
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

    #[cfg(debug_assertions)]
    db::export_ts_types_to("../src/types/db.ts").unwrap();

    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&db::url(), db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_positioner::init());

    // https://v2.tauri.app/plugin/single-instance/#focusing-on-new-instance
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
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

    builder = builder.plugin(tauri_plugin_deep_link::init()).setup(|app| {
        let app_handle = app.handle().clone();

        app.deep_link().on_open_url(move |event| {
            let urls = event.urls();
            let url = urls.first().unwrap();

            if url.path() == "/auth" {
                let query_pairs: std::collections::HashMap<String, String> = url
                    .query_pairs()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect();

                let local_data_dir = app_handle.path().app_local_data_dir().unwrap();
                let file_path = local_data_dir.join("api_key.txt");
                let key = query_pairs.get("key").unwrap().clone();

                std::fs::write(&file_path, key).unwrap();
                let _ = app_handle.emit("auth", true);
            }
        });

        Ok(())
    });

    // https://v2.tauri.app/plugin/deep-linking/#registering-desktop-deep-links-at-runtime
    #[cfg(any(windows, target_os = "linux"))]
    {
        builder = builder.setup(|app| {
            {
                app.deep_link().register_all()?;
            }

            Ok(())
        });
    }

    let (audio_input_tx, _audio_input_rx) = AudioInputFeed::create_channel();

    builder
        // TODO: https://v2.tauri.app/plugin/updater/#building
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(|app| {
            let salt_path = app.path().app_local_data_dir()?.join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            Ok(())
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
        .setup(move |app| {
            let app = app.handle().clone();

            if let Ok(Some(_auth)) = auth::AuthStore::load(&app) {}

            app.manage(RwLock::new(App {
                handle: app.clone(),
                audio_input_tx,
                audio_input_feed: None,
            }));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
