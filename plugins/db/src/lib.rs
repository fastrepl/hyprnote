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
use desktop::Db;
#[cfg(mobile)]
use mobile::Db;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the db APIs.
pub trait DbExt<R: Runtime> {
    fn db(&self) -> &Db<R>;
}

impl<R: Runtime, T: Manager<R>> crate::DbExt<R> for T {
    fn db(&self) -> &Db<R> {
        self.state::<Db<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("db")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let db = mobile::init(app, api)?;
            #[cfg(desktop)]
            let db = desktop::init(app, api)?;
            app.manage(db);
            Ok(())
        })
        .build()
}
