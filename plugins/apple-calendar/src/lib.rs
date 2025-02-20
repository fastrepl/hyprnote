use std::sync::Mutex;

use tauri::{Manager, Wry};

mod commands;
mod error;
mod worker;

pub use error::{Error, Result};

pub type ManagedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    pub worker_handle: Option<tokio::task::JoinHandle<()>>,
}

const PLUGIN_NAME: &str = "apple-calendar";

pub trait AppleCalendarExt<R: tauri::Runtime> {
    fn start_worker(&self, user_id: impl Into<String>) -> Result<()>;
}

impl<R: tauri::Runtime, T: Manager<R>> crate::AppleCalendarExt<R> for T {
    fn start_worker(&self, user_id: impl Into<String>) -> Result<()> {
        let db = self.state::<hypr_db::user::UserDatabase>().inner().clone();
        let user_id = user_id.into();

        let state = self.state::<ManagedState>();
        let mut s = state.lock().unwrap();

        s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
            let _ = worker::monitor(worker::WorkerState { db, user_id }).await;
        }));

        Ok(())
    }
}

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::calendar_access_status,
            commands::contacts_access_status,
            commands::request_calendar_access,
            commands::request_contacts_access,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
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
        make_specta_builder()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./generated/bindings.ts",
            )
            .unwrap()
    }
}
