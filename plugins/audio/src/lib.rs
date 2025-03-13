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
use desktop::Audio;
#[cfg(mobile)]
use mobile::Audio;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the audio APIs.
pub trait AudioExt<R: Runtime> {
    fn audio(&self) -> &Audio<R>;
}

impl<R: Runtime, T: Manager<R>> crate::AudioExt<R> for T {
    fn audio(&self) -> &Audio<R> {
        self.state::<Audio<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("audio")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let audio = mobile::init(app, api)?;
            #[cfg(desktop)]
            let audio = desktop::init(app, api)?;
            app.manage(audio);
            Ok(())
        })
        .build()
}
