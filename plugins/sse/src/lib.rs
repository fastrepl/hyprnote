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
use desktop::Sse;
#[cfg(mobile)]
use mobile::Sse;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the sse APIs.
pub trait SseExt<R: Runtime> {
    fn sse(&self) -> &Sse<R>;
}

impl<R: Runtime, T: Manager<R>> crate::SseExt<R> for T {
    fn sse(&self) -> &Sse<R> {
        self.state::<Sse<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sse")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let sse = mobile::init(app, api)?;
            #[cfg(desktop)]
            let sse = desktop::init(app, api)?;
            app.manage(sse);
            Ok(())
        })
        .build()
}
