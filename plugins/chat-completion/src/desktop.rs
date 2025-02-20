use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<ChatCompletion<R>> {
    Ok(ChatCompletion(app.clone()))
}

/// Access to the chat-completion APIs.
pub struct ChatCompletion<R: Runtime>(AppHandle<R>);

impl<R: Runtime> ChatCompletion<R> {
    pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
        Ok(PingResponse {
            value: payload.value,
        })
    }
}
