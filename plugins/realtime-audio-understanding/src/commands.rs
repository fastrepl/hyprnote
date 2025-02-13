use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::HyprRealtimeAudioUnderstandingExt;
use crate::Result;

#[command]
pub(crate) async fn ping<R: Runtime>(
    app: AppHandle<R>,
    payload: PingRequest,
) -> Result<PingResponse> {
    app.hypr_realtime_audio_understanding().ping(payload)
}
