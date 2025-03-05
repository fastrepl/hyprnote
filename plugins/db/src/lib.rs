use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod error;
mod ext;

pub use error::{Error, Result};
pub use ext::DatabasePluginExt;

pub type ManagedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    pub user_id: Option<String>,
    pub db: Option<hypr_db_user::UserDatabase>,
}

const PLUGIN_NAME: &str = "db";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_calendars,
            commands::list_participants,
            commands::upsert_calendar,
            commands::upsert_session,
            commands::list_templates,
            commands::upsert_template,
            commands::delete_template,
            commands::list_events,
            commands::list_sessions,
            commands::get_session,
            commands::set_session_event,
            commands::get_config,
            commands::set_config,
            commands::get_self_human,
            commands::upsert_human,
            commands::get_self_organization,
            commands::upsert_organization,
            commands::list_chat_groups,
            commands::list_chat_messages,
            commands::create_chat_group,
            commands::upsert_chat_message
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(ManagedState::default());
            Ok(())
        })
        .build()
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
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[test]
    fn test_db() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
