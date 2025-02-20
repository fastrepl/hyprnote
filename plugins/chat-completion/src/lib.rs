use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::ChatCompletion;
#[cfg(mobile)]
use mobile::ChatCompletion;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the chat-completion APIs.
pub trait ChatCompletionExt<R: Runtime> {
    fn chat_completion(&self) -> &ChatCompletion<R>;
}

impl<R: Runtime, T: Manager<R>> crate::ChatCompletionExt<R> for T {
    fn chat_completion(&self) -> &ChatCompletion<R> {
        self.state::<ChatCompletion<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("chat-completion")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let chat_completion = mobile::init(app, api)?;
            #[cfg(desktop)]
            let chat_completion = desktop::init(app, api)?;
            app.manage(chat_completion);
            Ok(())
        })
        .build()
}
