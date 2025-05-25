mod commands;
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

    let client = tauri_plugin_sentry::sentry::init((
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

    let _guard = tauri_plugin_sentry::minidump::init(&client);

    let mut builder = tauri::Builder::default();

    // https://v2.tauri.app/plugin/deep-linking/#desktop
    // should always be the first plugin
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            app.window_show(HyprWindow::Main).unwrap();
        }));
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
        .plugin(tauri_plugin_sentry::init(&client))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sfx::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_auth::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_analytics::init())
        .plugin(tauri_plugin_tray::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_windows::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ));

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

                app.deep_link().on_open_url(move |event| {
                    let url = if let Some(url) = event.urls().first() {
                        url.to_string()
                    } else {
                        return;
                    };

                    let dest = if let Ok(parsed_url) = url::Url::parse(&url) {
                        match parsed_url.path() {
                            "/notification" => {
                                if let Some(query) = parsed_url.query() {
                                    let params: std::collections::HashMap<String, String> =
                                        url::form_urlencoded::parse(query.as_bytes())
                                            .into_owned()
                                            .collect();

                                    if let Some(event_id) = params.get("event_id") {
                                        format!("/app/note?event_id={}", event_id)
                                    } else {
                                        "/app/new?record=true".to_string()
                                    }
                                } else {
                                    "/app/new?record=true".to_string()
                                }
                            }
                            _ => "/app/new?record=false".to_string(),
                        }
                    } else {
                        "/app/new?record=false".to_string()
                    };

                    if app_clone.window_show(HyprWindow::Main).is_ok() {
                        let _ = app_clone.window_navigate(HyprWindow::Main, &dest);
                    }
                });
            }

            {
                use tauri_plugin_tray::TrayPluginExt;
                app.create_tray_menu().unwrap();
                app.create_app_menu().unwrap();
            }

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                let _ = autostart_manager.disable();
            }

            tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async move {
                    if let Err(e) = app.setup_db_for_local().await {
                        tracing::error!("failed_to_setup_db_for_local: {}", e);
                    }

                    {
                        use tauri_plugin_db::DatabasePluginExt;
                        let user_id = app.db_user_id().await;

                        if let Ok(Some(ref user_id)) = user_id {
                            tauri_plugin_sentry::sentry::configure_scope(|scope| {
                                scope.set_user(Some(tauri_plugin_sentry::sentry::User {
                                    id: Some(user_id.clone()),
                                    ..Default::default()
                                }));
                            });
                        }
                    }

                    tokio::spawn(async move {
                        app.setup_local_ai().await.unwrap();
                    });
                })
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .unwrap();

    let app_handle = app.handle().clone();
    HyprWindow::Main.show(&app_handle).unwrap();

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            HyprWindow::Main.show(app).unwrap();
        }
    });
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .commands(tauri_specta::collect_commands![
            commands::sentry_dsn::<tauri::Wry>,
            commands::is_onboarding_needed::<tauri::Wry>,
            commands::set_onboarding_needed::<tauri::Wry>,
            commands::setup_db_for_cloud::<tauri::Wry>,
            commands::set_autostart::<tauri::Wry>,
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
