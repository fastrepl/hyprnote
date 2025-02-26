mod permissions;

use tauri::Manager;
use tauri_plugin_tray::TrayPluginExt;
use tauri_plugin_windows::{ShowHyprWindow, WindowsPluginExt};

pub struct App {
    handle: tauri::AppHandle,
    user_id: String,
}

#[tokio::main]
pub async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    {
        let builder = tracing_subscriber::fmt()
            .with_file(true)
            .with_line_number(true)
            .with_env_filter(
                tracing_subscriber::EnvFilter::from_default_env()
                    .add_directive(tracing::Level::DEBUG.into())
                    .add_directive("ort=error".parse().unwrap())
                    .add_directive("rwhisper=trace".parse().unwrap())
                    .add_directive("kalosm_sound=trace".parse().unwrap()),
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
                use tauri_plugin_template::TemplatePluginExt;
                for (name, template) in tauri_plugin_misc::TEMPLATES {
                    app.register_template(name.to_string(), template.to_string())
                        .unwrap();
                }
            }

            let user_id = {
                use tauri_plugin_auth::{AuthPluginExt, Key};
                use tauri_plugin_db::DatabasePluginExt;

                if let Ok(Some(user_id)) = app.get_from_vault(Key::UserId) {
                    app.db_set_user_id(user_id.clone()).unwrap();
                    user_id
                } else {
                    app.db_create_new_user().unwrap()
                }
            };

            app.manage(App {
                user_id: user_id.clone(),
                handle: app.clone(),
            });

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                autostart_manager.enable().unwrap();
            }

            app.create_tray().unwrap();
            app.show_window(ShowHyprWindow::MainWithoutDemo).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            permissions::open_permission_settings,
            permissions::check_permission_status,
        ])
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
