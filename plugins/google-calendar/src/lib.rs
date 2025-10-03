
mod calendar_api;
mod commands;
mod contacts_api;
mod error;
mod ext;
mod oauth;
mod worker;

use std::sync::Mutex;
use tauri::Manager;

pub use calendar_api::{Calendar, Event};
pub use commands::{CalendarSelection, GoogleAccount, MultiAccountStatus};
pub use contacts_api::Contact;
pub use error::{Error, Result};
pub use ext::GoogleCalendarPluginExt;
pub use oauth::{AccessToken, GoogleOAuthConfig};

pub type ManagedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    pub worker_handle: Option<tokio::task::JoinHandle<()>>,
}

const PLUGIN_NAME: &str = "google-calendar";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::sync_calendars::<tauri::Wry>,
            commands::get_calendars::<tauri::Wry>,
            commands::sync_events::<tauri::Wry>,
            commands::sync_contacts::<tauri::Wry>,
            commands::get_contacts::<tauri::Wry>,
            commands::search_contacts::<tauri::Wry>,
            commands::revoke_access::<tauri::Wry>,
            commands::refresh_tokens::<tauri::Wry>,
            commands::get_connected_accounts::<tauri::Wry>,
            commands::add_google_account::<tauri::Wry>,
            commands::remove_google_account::<tauri::Wry>,
            commands::get_calendars_for_account::<tauri::Wry>,
            commands::get_contacts_for_account::<tauri::Wry>,
            commands::get_calendar_selections::<tauri::Wry>,
            commands::set_calendar_selected::<tauri::Wry>,
            commands::start_worker::<tauri::Wry>,
            commands::stop_worker::<tauri::Wry>,
            commands::get_calendars_needing_reconnection::<tauri::Wry>,
            commands::attempt_reconnect_account::<tauri::Wry>,
        ])
        .typ::<GoogleAccount>()
        .typ::<MultiAccountStatus>()
        .typ::<Calendar>()
        .typ::<Event>()
        .typ::<Contact>()
        .typ::<CalendarSelection>()
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
    fn test_google_calendar() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
