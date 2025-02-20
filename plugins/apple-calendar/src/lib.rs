use tauri::{Manager, Wry};

mod commands;
mod error;
mod worker;

pub use error::{Error, Result};
pub struct State {}

const PLUGIN_NAME: &str = "apple-calendar";

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![commands::ping])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let user_id = app
                .state::<tauri_plugin_db::ManagedState>()
                .lock()
                .unwrap()
                .user_id
                .as_ref()
                .unwrap()
                .clone();
            let db = app.state::<hypr_db::user::UserDatabase>().inner().clone();

            tokio::runtime::Handle::current().spawn(async move {
                worker::monitor(worker::WorkerState { db, user_id }).await;
            });

            app.manage(State {});
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
