use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;

pub use error::{Error, Result};

pub(crate) struct Listener {}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("listener")
        .invoke_handler(tauri::generate_handler![
            commands::start_session,
            commands::stop_session
        ])
        .setup(|app, _api| {
            let state = Listener {};

            app.manage(state);

            Ok(())
        })
        .build()
}
