use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<HyprRealtimeAudioUnderstanding<R>> {
    Ok(HyprRealtimeAudioUnderstanding(app.clone()))
}

/// Access to the hypr-realtime-audio-understanding APIs.
pub struct HyprRealtimeAudioUnderstanding<R: Runtime>(AppHandle<R>);

impl<R: Runtime> HyprRealtimeAudioUnderstanding<R> {
    pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
        Ok(PingResponse {
            value: payload.value,
        })
    }
}
