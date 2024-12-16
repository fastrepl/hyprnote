use cap_media::feeds::{AudioInputFeed, AudioInputSamplesSender};
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;

mod audio;
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
            permissions::open_permission_settings,
        ])
        .events(tauri_specta::collect_events![events::Transcript])
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

    let (audio_input_tx, _audio_input_rx) = AudioInputFeed::create_channel();

    builder
        // https://v2.tauri.app/plugin/deep-linking/#desktop
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        // TODO: https://v2.tauri.app/plugin/updater/#building
        // .plugin(tauri_plugin_updater::Builder::new().build())
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
