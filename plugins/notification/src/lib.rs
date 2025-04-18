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
use desktop::Notification;
#[cfg(mobile)]
use mobile::Notification;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the notification APIs.
pub trait NotificationExt<R: Runtime> {
  fn notification(&self) -> &Notification<R>;
}

impl<R: Runtime, T: Manager<R>> crate::NotificationExt<R> for T {
  fn notification(&self) -> &Notification<R> {
    self.state::<Notification<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("notification")
    .invoke_handler(tauri::generate_handler![commands::ping])
    .setup(|app, api| {
      #[cfg(mobile)]
      let notification = mobile::init(app, api)?;
      #[cfg(desktop)]
      let notification = desktop::init(app, api)?;
      app.manage(notification);
      Ok(())
    })
    .build()
}
