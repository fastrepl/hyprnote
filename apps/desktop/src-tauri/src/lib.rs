mod commands;
mod deeplink;
mod ext;
mod store;

use ext::*;
use store::*;

use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};

use tracing_subscriber::{
    fmt, prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt, EnvFilter,
};

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    {
        let env_filter =
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

        tracing_subscriber::Registry::default()
            .with(fmt::layer())
            .with(env_filter)
            .with(tauri_plugin_sentry::sentry::integrations::tracing::layer())
            .init();
    }

    // On Linux, ensure critical environment variables are set for PulseAudio/PipeWire
    #[cfg(target_os = "linux")]
    {
        if std::env::var("XDG_RUNTIME_DIR").is_err() {
            if let Ok(uid) = std::env::var("UID") {
                let runtime_dir = format!("/run/user/{}", uid);
                std::env::set_var("XDG_RUNTIME_DIR", &runtime_dir);
                tracing::info!("Set XDG_RUNTIME_DIR to: {}", runtime_dir);
            } else if let Ok(output) = std::process::Command::new("id").arg("-u").output() {
                if let Ok(uid_str) = String::from_utf8(output.stdout) {
                    let uid = uid_str.trim();
                    let runtime_dir = format!("/run/user/{}", uid);
                    std::env::set_var("XDG_RUNTIME_DIR", &runtime_dir);
                    tracing::info!("Set XDG_RUNTIME_DIR to: {}", runtime_dir);
                }
            }
        }

        if std::env::var("DBUS_SESSION_BUS_ADDRESS").is_err() {
            // Try to detect D-Bus session bus address
            if let Ok(runtime_dir) = std::env::var("XDG_RUNTIME_DIR") {
                let dbus_path = format!("{}/bus", runtime_dir);
                if std::path::Path::new(&dbus_path).exists() {
                    let dbus_addr = format!("unix:path={}", dbus_path);
                    std::env::set_var("DBUS_SESSION_BUS_ADDRESS", &dbus_addr);
                    tracing::info!("Set DBUS_SESSION_BUS_ADDRESS to: {}", dbus_addr);
                }
            }
        }
    }

    let sentry_client = tauri_plugin_sentry::sentry::init((
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
        tauri_plugin_sentry::sentry::ClientOptions {
            release: tauri_plugin_sentry::sentry::release_name!(),
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
            app.window_show(HyprWindow::Main).unwrap();
        }));
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder = builder
        .plugin(tauri_plugin_listener::init())
        .plugin(tauri_plugin_sse::init())
        .plugin(tauri_plugin_misc::init())
        .plugin(tauri_plugin_db::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_store2::init())
        .plugin(tauri_plugin_template::init())
        .plugin(tauri_plugin_local_llm::init())
        .plugin(tauri_plugin_local_stt::init())
        .plugin(tauri_plugin_connector::init())
        .plugin(tauri_plugin_flags::init())
        .plugin(tauri_plugin_sentry::init_with_no_injection(&sentry_client))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_obsidian::init())
        .plugin(tauri_plugin_sfx::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_auth::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_task::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_machine_uid::init())
        .plugin(tauri_plugin_analytics::init())
        .plugin(tauri_plugin_tray::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_windows::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ));

    {
        // These are not secrets. In prod, we set different values in the environment. (See .github/workflows/desktop_cd.yml)
        let (keygen_account_id, keygen_verify_key) = {
            #[cfg(not(debug_assertions))]
            {
                (env!("KEYGEN_ACCOUNT_ID"), env!("KEYGEN_VERIFY_KEY"))
            }

            #[cfg(debug_assertions)]
            {
                (
                    option_env!("KEYGEN_ACCOUNT_ID")
                        .unwrap_or("76dfe152-397c-4689-9c5e-3669cefa34b9"),
                    option_env!("KEYGEN_VERIFY_KEY").unwrap_or(
                        "13f18c98b8c1e5539d92df4aad2d51f4d203d5aead296215df7c3d6376b78b13",
                    ),
                )
            }
        };

        builder = builder.plugin(
            tauri_plugin_keygen::Builder::new(keygen_account_id, keygen_verify_key).build(),
        );
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_plugin_apple_calendar::init())
    }

    #[cfg(not(debug_assertions))]
    {
        let plugin = tauri_plugin_prevent_default::init();
        builder = builder.plugin(plugin);
    }

    let specta_builder = make_specta_builder();

    let app = builder
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .on_window_event(tauri_plugin_windows::on_window_event)
        .setup(move |app| {
            let app = app.handle().clone();

            specta_builder.mount_events(&app);

            {
                use tauri_plugin_deep_link::DeepLinkExt;
                use tauri_plugin_windows::WindowsPluginExt;

                let app_clone = app.clone();

                // hypr://hyprnote.com + <path>
                app.deep_link().on_open_url(move |event| {
                    let url = if let Some(url) = event.urls().first() {
                        url.to_string()
                    } else {
                        return;
                    };

                    let dests = deeplink::parse(url);
                    for dest in dests {
                        if app_clone.window_show(dest.window.clone()).is_ok() {
                            let _ = app_clone.window_navigate(dest.window, &dest.url);
                        }
                    }
                });
            }

            {
                use tauri_plugin_tray::TrayPluginExt;
                app.create_tray_menu().unwrap();
                app.create_app_menu().unwrap();
            }

            let app_clone = app.clone();
            tokio::spawn(async move {
                if let Err(e) = app_clone.setup_db_for_local().await {
                    tracing::error!("failed_to_setup_db_for_local: {}", e);
                }

                {
                    use tauri_plugin_db::DatabasePluginExt;
                    let user_id = app_clone.db_user_id().await;

                    if let Ok(Some(ref user_id)) = user_id {
                        let config = app_clone.db_get_config(user_id).await;

                        if let Ok(Some(ref config)) = config {
                            if !config.general.telemetry_consent {
                                let _ =
                                    sentry_client.close(Some(std::time::Duration::from_secs(1)));
                            }
                        }

                        tauri_plugin_sentry::sentry::configure_scope(|scope| {
                            scope.set_user(Some(tauri_plugin_sentry::sentry::User {
                                id: Some(user_id.clone()),
                                ..Default::default()
                            }));
                        });
                    }
                }

                tokio::spawn(async move {
                    app_clone.setup_local_ai().await.unwrap();
                });
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .unwrap();

    let app_handle = app.handle().clone();
    tracing::info!("Attempting to show main window");
    if let Err(e) = HyprWindow::Main.show(&app_handle) {
        tracing::error!("Failed to show main window: {:?}", e);
        tracing::info!("Continuing without showing main window - you may need to open it manually");
        tracing::info!("You can try opening the window using the system tray or keyboard shortcut");
    } else {
        tracing::info!("Main window shown successfully");
    }

    #[cfg(target_os = "macos")]
    app.run(|app, event| {
        if let tauri::RunEvent::Reopen { .. } = event {
            HyprWindow::Main.show(app).unwrap();
        }
    });

    #[cfg(not(target_os = "macos"))]
    app.run(|_app, _event| {});
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .commands(tauri_specta::collect_commands![
            commands::sentry_dsn::<tauri::Wry>,
            commands::is_onboarding_needed::<tauri::Wry>,
            commands::set_onboarding_needed::<tauri::Wry>,
            commands::setup_db_for_cloud::<tauri::Wry>,
            commands::set_autostart::<tauri::Wry>,
            commands::is_individualization_needed::<tauri::Wry>,
            commands::set_individualization_needed::<tauri::Wry>,
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
