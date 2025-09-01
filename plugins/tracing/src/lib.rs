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
use desktop::Tracing;
#[cfg(mobile)]
use mobile::Tracing;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the tracing APIs.
pub trait TracingExt<R: Runtime> {
    fn tracing(&self) -> &Tracing<R>;
}

impl<R: Runtime, T: Manager<R>> crate::TracingExt<R> for T {
    fn tracing(&self) -> &Tracing<R> {
        self.state::<Tracing<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("tracing")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let tracing = mobile::init(app, api)?;
            #[cfg(desktop)]
            let tracing = desktop::init(app, api)?;
            app.manage(tracing);
            Ok(())
        })
        .build()
}
