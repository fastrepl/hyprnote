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
use desktop::Membership;
#[cfg(mobile)]
use mobile::Membership;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the membership APIs.
pub trait MembershipExt<R: Runtime> {
    fn membership(&self) -> &Membership<R>;
}

impl<R: Runtime, T: Manager<R>> crate::MembershipExt<R> for T {
    fn membership(&self) -> &Membership<R> {
        self.state::<Membership<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("membership")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let membership = mobile::init(app, api)?;
            #[cfg(desktop)]
            let membership = desktop::init(app, api)?;
            app.manage(membership);
            Ok(())
        })
        .build()
}
