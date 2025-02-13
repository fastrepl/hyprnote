use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod desktop;
mod error;
mod models;

pub use error::{Error, Result};
pub use models::*;

use desktop::HyprRealtimeAudioUnderstanding;

pub trait HyprRealtimeAudioUnderstandingExt<R: Runtime> {
    fn hypr_realtime_audio_understanding(&self) -> &HyprRealtimeAudioUnderstanding<R>;
}

impl<R: Runtime, T: Manager<R>> crate::HyprRealtimeAudioUnderstandingExt<R> for T {
    fn hypr_realtime_audio_understanding(&self) -> &HyprRealtimeAudioUnderstanding<R> {
        self.state::<HyprRealtimeAudioUnderstanding<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("hypr-realtime-audio-understanding")
        .invoke_handler(tauri::generate_handler![
            commands::start_session,
            commands::stop_session
        ])
        .setup(|app, api| {
            let hypr_realtime_audio_understanding = desktop::init(app, api)?;
            app.manage(hypr_realtime_audio_understanding);
            Ok(())
        })
        .build()
}
