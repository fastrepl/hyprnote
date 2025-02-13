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
use desktop::HyprRealtimeAudioUnderstanding;
#[cfg(mobile)]
use mobile::HyprRealtimeAudioUnderstanding;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the hypr-realtime-audio-understanding APIs.
pub trait HyprRealtimeAudioUnderstandingExt<R: Runtime> {
    fn hypr_realtime_audio_understanding(&self) -> &HyprRealtimeAudioUnderstanding<R>;
}

impl<R: Runtime, T: Manager<R>> crate::HyprRealtimeAudioUnderstandingExt<R> for T {
    fn hypr_realtime_audio_understanding(&self) -> &HyprRealtimeAudioUnderstanding<R> {
        self.state::<HyprRealtimeAudioUnderstanding<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("hypr-realtime-audio-understanding")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .setup(|app, api| {
            #[cfg(mobile)]
            let hypr_realtime_audio_understanding = mobile::init(app, api)?;
            #[cfg(desktop)]
            let hypr_realtime_audio_understanding = desktop::init(app, api)?;
            app.manage(hypr_realtime_audio_understanding);
            Ok(())
        })
        .build()
}
