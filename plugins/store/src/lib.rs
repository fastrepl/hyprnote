mod commands;
mod error;
mod ext;

pub use error::{Error, Result};
pub use ext::*;

const PLUGIN_NAME: &str = "hypr-store";

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|_app, _api| Ok(()))
        .build()
}
