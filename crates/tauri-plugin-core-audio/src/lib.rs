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
use desktop::CoreAudio;
#[cfg(mobile)]
use mobile::CoreAudio;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the core-audio APIs.
pub trait CoreAudioExt<R: Runtime> {
    fn core_audio(&self) -> &CoreAudio<R>;
}

impl<R: Runtime, T: Manager<R>> crate::CoreAudioExt<R> for T {
    fn core_audio(&self) -> &CoreAudio<R> {
        self.state::<CoreAudio<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("core-audio")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let core_audio = mobile::init(app, api)?;
            #[cfg(desktop)]
            let core_audio = desktop::init(app, api)?;
            app.manage(core_audio);
            Ok(())
        })
        .build()
}
