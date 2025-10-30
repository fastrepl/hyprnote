mod commands;

use tauri_plugin_windows::{AppWindow, WindowsPluginExt};

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    let sentry_client = sentry::init((
        {
            #[cfg(not(debug_assertions))]
            {
                env!("SENTRY_DSN")
            }

            #[cfg(debug_assertions)]
            {
                option_env!("SENTRY_DSN").unwrap_or_default()
            }
        },
        sentry::ClientOptions {
            release: sentry::release_name!(),
            traces_sample_rate: 1.0,
            auto_session_tracking: true,
            ..Default::default()
        },
    ));

    let _guard = tauri_plugin_sentry::minidump::init(&sentry_client);

    let mut builder = tauri::Builder::default();

    // https://v2.tauri.app/plugin/deep-linking/#desktop
    // should always be the first plugin
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            app.window_show(AppWindow::Main).unwrap();
        }));
    }

    builder = builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_auth::init())
        .plugin(tauri_plugin_analytics::init())
        .plugin(tauri_plugin_db2::init())
        .plugin(tauri_plugin_tracing::init())
        .plugin(tauri_plugin_listener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_local_stt::init())
        .plugin(tauri_plugin_permissions::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_sentry::init_with_no_injection(&sentry_client))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_misc::init())
        .plugin(tauri_plugin_template::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_detect::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_tray::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_windows::init());

    #[cfg(all(not(debug_assertions), not(feature = "devtools")))]
    {
        let plugin = tauri_plugin_prevent_default::init();
        builder = builder.plugin(plugin);
    }

    let specta_builder = make_specta_builder();

    let app = builder
        .invoke_handler(specta_builder.invoke_handler())
        .on_window_event(tauri_plugin_windows::on_window_event)
        .setup(move |app| {
            let app = app.handle().clone();

            let app_clone = app.clone();

            {
                use tauri_plugin_tray::TrayPluginExt;
                app.create_tray_menu().unwrap();
                app.create_app_menu().unwrap();
            }

            tokio::spawn(async move {
                use tauri_plugin_db2::Database2PluginExt;

                if let Err(e) = app_clone.init_local().await {
                    tracing::error!("failed_to_init_local: {}", e);
                }
                // if let Err(e) = app_clone.init_cloud(postgres_url).await {
                //     tracing::error!("failed_to_init_cloud: {}", e);
                // }
            });

            specta_builder.mount_events(&app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .unwrap();

    if true {
        let app_handle = app.handle().clone();
        AppWindow::Main.show(&app_handle).unwrap();
    }

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            AppWindow::Main.show(app).unwrap();
        }
    });
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .commands(tauri_specta::collect_commands![
            commands::parse_subtitle::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
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
