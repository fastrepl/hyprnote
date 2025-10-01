use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};

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
            app.window_show(HyprWindow::Main).unwrap();
        }));
    }

    builder = builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_analytics::init())
        .plugin(tauri_plugin_db2::init())
        .plugin(tauri_plugin_listener::init())
        .plugin(tauri_plugin_local_stt::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_windows::init());

    #[cfg(all(not(debug_assertions), not(feature = "devtools")))]
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

            let app_clone = app.clone();
            tokio::spawn(async move {
                use tauri_plugin_db2::Database2PluginExt;

                if let Err(e) = app_clone.init_local().await {
                    tracing::error!("failed_to_init_local: {}", e);
                }
                if let Err(e) = app_clone
                    .init_cloud("postgresql://yujonglee@localhost:5432/hyprnote_dev")
                    .await
                {
                    tracing::error!("failed_to_init_cloud: {}", e);
                }
            });

            specta_builder.mount_events(&app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .unwrap();

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            HyprWindow::Main.show(app).unwrap();
        }
    });
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .commands(tauri_specta::collect_commands![])
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
