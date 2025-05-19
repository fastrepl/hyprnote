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
            commands::events::get_event,
            commands::events::list_events,
            commands::calendars::get_calendar,
            commands::calendars::list_calendars,
            commands::calendars::upsert_calendar,
            commands::calendars::toggle_calendar_selected,
            commands::sessions::upsert_session,
            commands::sessions::visit_session,
            commands::templates::list_templates,
            commands::templates::upsert_template,
            commands::templates::delete_template,
            commands::sessions::onboarding_session_id,
            commands::sessions::list_sessions,
            commands::sessions::delete_session,
            commands::sessions::get_session,
            commands::sessions::set_session_event,
            commands::sessions::session_add_participant,
            commands::sessions::session_remove_participant,
            commands::sessions::session_list_participants,
            commands::sessions::session_get_event,
            commands::sessions::get_words,
            commands::sessions::get_words_onboarding,
            commands::configs::get_config,
            commands::configs::set_config,
            commands::humans::get_human,
            commands::humans::upsert_human,
            commands::humans::list_humans,
            commands::organizations::get_organization,
            commands::organizations::get_organization_by_user_id,
            commands::organizations::upsert_organization,
            commands::organizations::list_organizations,
            commands::organizations::list_organization_members,
            commands::chats::list_chat_groups,
            commands::chats::list_chat_messages,
            commands::chats::create_chat_group,
            commands::chats::upsert_chat_message,
            commands::tags::list_all_tags,
            commands::tags::list_session_tags,
            commands::tags::assign_tag_to_session,
            commands::tags::unassign_tag_from_session,
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
