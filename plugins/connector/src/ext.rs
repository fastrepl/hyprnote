use std::future::Future;

use crate::StoreKey;
use tauri_plugin_store2::StorePluginExt;

#[derive(Debug, serde::Deserialize, serde::Serialize, specta::Type)]
pub struct Connection {
    pub api_base: String,
    pub api_key: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, specta::Type)]
#[serde(tag = "type", content = "connection")]
pub enum ConnectionLLM {
    HyprCloud(Connection),
    HyprLocal(Connection),
    Custom(Connection),
}

#[derive(Debug, serde::Deserialize, serde::Serialize, specta::Type)]
#[serde(tag = "type", content = "connection")]
pub enum ConnectionSTT {
    HyprCloud(Connection),
    HyprLocal(Connection),
}

pub trait ConnectorPluginExt<R: tauri::Runtime> {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn get_custom_llm_connection(&self) -> Result<Option<Connection>, crate::Error>;
    fn set_custom_llm_connection(&self, connection: Connection) -> Result<(), crate::Error>;

    fn get_llm_connection(&self) -> impl Future<Output = Result<ConnectionLLM, crate::Error>>;
    fn get_stt_connection(&self) -> impl Future<Output = Result<ConnectionSTT, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ConnectorPluginExt<R> for T {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn set_custom_llm_connection(&self, connection: Connection) -> Result<(), crate::Error> {
        self.connector_store()
            .set(StoreKey::OpenaiApiBase, connection.api_base)?;
        self.connector_store()
            .set(StoreKey::OpenaiApiKey, connection.api_key)?;

        Ok(())
    }

    fn get_custom_llm_connection(&self) -> Result<Option<Connection>, crate::Error> {
        let api_base = self.connector_store().get(StoreKey::OpenaiApiBase)?;
        let api_key = self.connector_store().get(StoreKey::OpenaiApiKey)?;

        match (api_base, api_key) {
            (Some(api_base), Some(api_key)) => Ok(Some(Connection { api_base, api_key })),
            _ => Ok(None),
        }
    }

    async fn get_llm_connection(&self) -> Result<ConnectionLLM, crate::Error> {
        if is_online().await {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey, VaultKey};

            if let Ok(Some(_)) = self.get_from_store(StoreKey::AccountId) {
                let api_base = if cfg!(debug_assertions) {
                    "http://localhost:1234".to_string()
                } else {
                    "https://app.hyprnote.com".to_string()
                };

                let api_key = if cfg!(debug_assertions) {
                    None
                } else {
                    self.get_from_vault(VaultKey::RemoteServer)?
                };

                return Ok(ConnectionLLM::HyprCloud(Connection { api_base, api_key }));
            }
        }

        Ok(ConnectionLLM::HyprLocal(Connection {
            api_base: "http://localhost:1234".to_string(),
            api_key: None,
        }))
    }

    async fn get_stt_connection(&self) -> Result<ConnectionSTT, crate::Error> {
        Ok(ConnectionSTT::HyprCloud(Connection {
            api_base: "https://app.hyprnote.com".to_string(),
            api_key: None,
        }))
    }
}

async fn is_online() -> bool {
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
