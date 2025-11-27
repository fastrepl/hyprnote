mod commands;
mod ext;
mod store;
mod supervisor;

use ext::*;
use store::*;

use tauri_plugin_windows::{AppWindow, WindowsPluginExt};

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    let (root_supervisor_ctx, root_supervisor_handle) =
        match supervisor::spawn_root_supervisor().await {
            Some((ctx, handle)) => (Some(ctx), Some(handle)),
            None => (None, None),
        };

    let sentry_client = {
        let dsn = option_env!("SENTRY_DSN");

        if let Some(dsn) = dsn {
            let client = sentry::init((
                dsn,
                sentry::ClientOptions {
                    release: sentry::release_name!(),
                    traces_sample_rate: 1.0,
                    auto_session_tracking: true,
                    ..Default::default()
                },
            ));

            Some(client)
        } else {
            None
        }
    };

    let _guard = sentry_client
        .as_ref()
        .map(|client| tauri_plugin_sentry::minidump::init(client));

    let mut builder = tauri::Builder::default();

    // https://v2.tauri.app/plugin/deep-linking/#desktop
    // should always be the first plugin
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            app.window_show(AppWindow::Main).unwrap();
        }));
    }

    builder = builder
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_cli2::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_auth::init())
        .plugin(tauri_plugin_analytics::init())
        .plugin(tauri_plugin_db2::init())
        .plugin(tauri_plugin_tracing::init())
        .plugin(tauri_plugin_hooks::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_permissions::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_deeplink2::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_misc::init())
        .plugin(tauri_plugin_template::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_detect::init())
        .plugin(tauri_plugin_extensions::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_tray::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_store2::init())
        .plugin(tauri_plugin_windows::init())
        .plugin(tauri_plugin_listener::init())
        .plugin(tauri_plugin_listener2::init())
        .plugin(tauri_plugin_local_stt::init(
            tauri_plugin_local_stt::InitOptions {
                parent_supervisor: root_supervisor_ctx
                    .as_ref()
                    .map(|ctx| ctx.supervisor.get_cell()),
            },
        ))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ));

    if let Some(client) = sentry_client.as_ref() {
        builder = builder.plugin(tauri_plugin_sentry::init_with_no_injection(client));
    }

    #[cfg(all(not(debug_assertions), not(feature = "devtools")))]
    {
        let plugin = tauri_plugin_prevent_default::init();
        builder = builder.plugin(plugin);
    }

    let specta_builder = make_specta_builder();

    let root_supervisor_ctx_for_run = root_supervisor_ctx.clone();

    let app = builder
        .invoke_handler(specta_builder.invoke_handler())
        .on_window_event(tauri_plugin_windows::on_window_event)
        .setup(move |app| {
            let app_handle = app.handle().clone();

            let app_clone = app_handle.clone();

            {
                use tauri_plugin_tray::TrayPluginExt;
                app_handle.create_tray_menu().unwrap();
                app_handle.create_app_menu().unwrap();
            }

            tokio::spawn(async move {
                use tauri_plugin_db2::Database2PluginExt;

                if let Err(e) = app_clone.init_local().await {
                    tracing::error!("failed_to_init_local: {}", e);
                }
            });

            if let (Some(ctx), Some(handle)) = (&root_supervisor_ctx, root_supervisor_handle) {
                supervisor::monitor_supervisor(handle, ctx.is_exiting.clone(), app_handle.clone());
            }

            specta_builder.mount_events(&app_handle);
            Ok(())
        })
        .build(tauri::generate_context!())
        .unwrap();

    {
        let app_handle = app.handle().clone();
        if app.get_onboarding_needed().unwrap_or(true) {
            AppWindow::Main.hide(&app_handle).unwrap();
            AppWindow::Onboarding.show(&app_handle).unwrap();
        } else {
            AppWindow::Onboarding.destroy(&app_handle).unwrap();
            AppWindow::Main.show(&app_handle).unwrap();
        }
    }

    app.run(move |app, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            if app.get_onboarding_needed().unwrap_or(true) {
                AppWindow::Main.hide(&app).unwrap();
                AppWindow::Onboarding.show(&app).unwrap();
            } else {
                AppWindow::Onboarding.destroy(&app).unwrap();
                AppWindow::Main.show(&app).unwrap();
            }
        }
        tauri::RunEvent::Exit => {
            if let Some(ref ctx) = root_supervisor_ctx_for_run {
                ctx.mark_exiting();
                ctx.stop();
            }
            hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);
        }
        _ => {}
    });
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .commands(tauri_specta::collect_commands![
            commands::get_onboarding_needed::<tauri::Wry>,
            commands::set_onboarding_needed::<tauri::Wry>,
            commands::get_env::<tauri::Wry>,
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
