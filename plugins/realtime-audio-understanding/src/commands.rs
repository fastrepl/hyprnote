use tauri::{command, ipc::Channel, AppHandle, Runtime};

use crate::HyprRealtimeAudioUnderstandingExt;
use crate::Result;

#[command]
pub(crate) async fn start_session<R: Runtime>(
    app: AppHandle<R>,
    channel: Channel<String>,
) -> Result<()> {
    app.hypr_realtime_audio_understanding()
        .start_session(channel)
}

#[command]
pub(crate) async fn stop_session<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.hypr_realtime_audio_understanding().stop_session()
}
