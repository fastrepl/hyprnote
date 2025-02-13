use serde::de::DeserializeOwned;
use tauri::{ipc::Channel, plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<HyprRealtimeAudioUnderstanding<R>> {
    Ok(HyprRealtimeAudioUnderstanding(app.clone()))
}

pub struct HyprRealtimeAudioUnderstanding<R: Runtime>(AppHandle<R>);

impl<R: Runtime> HyprRealtimeAudioUnderstanding<R> {
    pub fn start_session(&self, channel: Channel<String>) -> crate::Result<()> {
        channel.send(String::from("ping")).unwrap();
        Ok(())
    }

    pub fn stop_session(&self) -> crate::Result<()> {
        Ok(())
    }
}
