use tauri_plugin_windows::{ShowHyprWindow, WindowsPluginExt};

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    {
        let builder = tracing_subscriber::fmt()
            .with_file(true)
            .with_line_number(true)
            .with_env_filter(
                tracing_subscriber::EnvFilter::from_default_env()
                    .add_directive(tracing::Level::INFO.into())
                    .add_directive("ort=error".parse().unwrap())
                    .add_directive("hyper=error".parse().unwrap())
                    .add_directive("rustls=error".parse().unwrap()),
            );

        builder.init();
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

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_listener::init())
        .plugin(tauri_plugin_sse::init())
        .plugin(tauri_plugin_misc::init())
        .plugin(tauri_plugin_db::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_template::init())
        .plugin(tauri_plugin_local_llm::init())
        .plugin(tauri_plugin_local_stt::init())
        .plugin(tauri_plugin_connector::init())
        .plugin(tauri_plugin_sentry::init(&client))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_sfx::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_auth::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_tray::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_windows::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            app.show_window(ShowHyprWindow::MainWithoutDemo).unwrap();
        }));

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_plugin_apple_calendar::init());
    }

    let specta_builder = make_specta_builder();

    builder
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            let app = app.handle().clone();

            specta_builder.mount_events(&app);

            {
                use tauri_plugin_store::StoreExt;
                let _ = app.store("store.json")?;
            }

            let (user_id, account_id, server_token, database_token) = {
                use tauri_plugin_auth::{AuthPluginExt, StoreKey, VaultKey};

                let user_id = app.get_from_store(StoreKey::UserId).unwrap_or(None);
                let account_id = app.get_from_store(StoreKey::AccountId).unwrap_or(None);

                if let Some(account_id) = account_id.as_ref() {
                    app.init_vault(account_id).unwrap();
                }

                let remote_server = account_id
                    .as_ref()
                    .and_then(|_| app.get_from_vault(VaultKey::RemoteServer).unwrap_or(None));
                let remote_database = account_id
                    .as_ref()
                    .and_then(|_| app.get_from_vault(VaultKey::RemoteDatabase).unwrap_or(None));

                (user_id, account_id, remote_server, remote_database)
            };

            {
                use hypr_turso::{format_db_name, format_db_url};
                use tauri_plugin_db::DatabasePluginExt;

                let local_db_path = app.local_db_path();
                let db = tokio::task::block_in_place(|| {
                    tokio::runtime::Handle::current().block_on(async move {
                        let mut base =
                            hypr_db_core::DatabaseBaseBuilder::default().local(local_db_path);

                        if let Some(account_id) = account_id.as_ref() {
                            let db_name = format_db_name(account_id);
                            let db_url = format_db_url(&db_name);
                            base = base.remote(db_url, database_token.unwrap());
                        }

                        base.build().await.unwrap()
                    })
                });

                if let Some(user_id) = user_id {
                    app.db_set_user_id(user_id).unwrap();
                }

                app.attach_libsql_db(db).unwrap();
            }

            {
                use tauri_plugin_template::TemplatePluginExt;
                for (name, template) in tauri_plugin_misc::TEMPLATES {
                    app.register_template(name.to_string(), template.to_string())
                        .unwrap();
                }
            }

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                autostart_manager.enable().unwrap();
            }

            {
                use tauri_plugin_tray::TrayPluginExt;
                app.create_tray().unwrap();
            }

            app.show_window(ShowHyprWindow::MainWithoutDemo).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder()
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
