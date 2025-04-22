use std::future::Future;

use crate::StoreKey;
use tauri_plugin_store2::StorePluginExt;

#[derive(Debug, serde::Deserialize, serde::Serialize, specta::Type)]
pub enum ConnectionType {
    #[serde(rename = "auto-llm")]
    #[specta(rename = "auto-llm")]
    AutoLLM,
    #[serde(rename = "auto-stt")]
    #[specta(rename = "auto-stt")]
    AutoSTT,
}

pub trait ConnectorPluginExt<R: tauri::Runtime> {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn is_online(&self) -> impl Future<Output = bool>;

    fn get_custom_openai_api_base(&self) -> Result<Option<String>, crate::Error>;
    fn set_custom_openai_api_base(&self, api_base: String) -> Result<(), crate::Error>;

    fn get_api_base(
        &self,
        t: ConnectionType,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;

    fn get_api_key(
        &self,
        t: ConnectionType,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ConnectorPluginExt<R> for T {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    async fn is_online(&self) -> bool {
        let target = "8.8.8.8".to_string();
        let interval = std::time::Duration::from_secs(1);
        let options = pinger::PingOptions::new(target, interval, None);

        if let Ok(stream) = pinger::ping(options) {
            if let Some(message) = stream.into_iter().next() {
                match message {
                    pinger::PingResult::Pong(_, _) => return true,
                    _ => return false,
                }
            }
        }

        false
    }

    fn get_custom_openai_api_base(&self) -> Result<Option<String>, crate::Error> {
        let store = self.connector_store();
        store
            .get(StoreKey::OpenaiApiBase)
            .map_err(crate::Error::Store)
    }

    fn set_custom_openai_api_base(&self, api_base: String) -> Result<(), crate::Error> {
        let store = self.connector_store();
        store
            .set(StoreKey::OpenaiApiBase, api_base)
            .map_err(crate::Error::Store)
    }

    async fn get_api_base(&self, t: ConnectionType) -> Result<Option<String>, crate::Error> {
        if self.is_online().await {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey};
            if let Ok(Some(_)) = self.get_from_store(StoreKey::AccountId) {
                let api_base = if cfg!(debug_assertions) {
                    "http://localhost:1234".to_string()
                } else {
                    "https://app.hyprnote.com".to_string()
                };

                return Ok(Some(api_base));
            }
        }

        match t {
            ConnectionType::AutoLLM => {
                use tauri_plugin_local_llm::{LocalLlmPluginExt, SharedState};

                if self.is_server_running().await {
                    let state = self.state::<SharedState>();
                    let guard = state.lock().await;
                    Ok(guard.api_base.clone())
                } else {
                    let api_base = self.start_server().await?;
                    Ok(Some(api_base))
                }
            }
            ConnectionType::AutoSTT => {
                use tauri_plugin_local_stt::{LocalSttPluginExt, SharedState};

                if self.is_server_running().await {
                    let state = self.state::<SharedState>();
                    let guard = state.lock().await;
                    Ok(guard.api_base.clone())
                } else {
                    let api_base = self.start_server().await?;
                    Ok(Some(api_base))
                }
            }
        }
    }

    async fn get_api_key(&self, t: ConnectionType) -> Result<Option<String>, crate::Error> {
        match t {
            ConnectionType::AutoSTT => Ok(None),
            ConnectionType::AutoLLM => Ok(None),
        }
    }
}
