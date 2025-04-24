use std::future::Future;

use crate::{Connection, ConnectionLLM, ConnectionSTT, StoreKey};
use tauri_plugin_store2::StorePluginExt;

pub trait ConnectorPluginExt<R: tauri::Runtime> {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn set_custom_llm_enabled(&self, enabled: bool) -> Result<(), crate::Error>;
    fn get_custom_llm_enabled(&self) -> Result<bool, crate::Error>;
    fn get_custom_llm_connection(&self) -> Result<Option<Connection>, crate::Error>;
    fn set_custom_llm_connection(&self, connection: Connection) -> Result<(), crate::Error>;

    fn get_llm_connection(&self) -> impl Future<Output = Result<ConnectionLLM, crate::Error>>;
    fn get_stt_connection(&self) -> impl Future<Output = Result<ConnectionSTT, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ConnectorPluginExt<R> for T {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn set_custom_llm_enabled(&self, enabled: bool) -> Result<(), crate::Error> {
        self.connector_store()
            .set(StoreKey::CustomEnabled, enabled)?;
        Ok(())
    }

    fn get_custom_llm_enabled(&self) -> Result<bool, crate::Error> {
        Ok(self
            .connector_store()
            .get(StoreKey::CustomEnabled)?
            .unwrap_or(false))
    }

    fn set_custom_llm_connection(&self, connection: Connection) -> Result<(), crate::Error> {
        self.connector_store()
            .set(StoreKey::CustomApiBase, connection.api_base)?;
        self.connector_store()
            .set(StoreKey::CustomApiKey, connection.api_key)?;

        Ok(())
    }

    fn get_custom_llm_connection(&self) -> Result<Option<Connection>, crate::Error> {
        let api_base = self.connector_store().get(StoreKey::CustomApiBase)?;
        let api_key = self.connector_store().get(StoreKey::CustomApiKey)?;

        match (api_base, api_key) {
            (Some(api_base), Some(api_key)) => Ok(Some(Connection { api_base, api_key })),
            _ => Ok(None),
        }
    }

    async fn get_llm_connection(&self) -> Result<ConnectionLLM, crate::Error> {
        let store = self.connector_store();
        let custom_enabled = self.get_custom_llm_enabled()?;

        {
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

        if custom_enabled {
            let api_base = store
                .get::<Option<String>>(StoreKey::CustomApiBase)?
                .flatten()
                .unwrap();
            let api_key = store
                .get::<Option<String>>(StoreKey::CustomApiKey)?
                .flatten();

            let conn = ConnectionLLM::Custom(Connection { api_base, api_key });
            match conn.models().await {
                Ok(models) if !models.is_empty() => Ok(conn),
                _ => Err(crate::Error::NoModelsFound),
            }
        } else {
            use tauri_plugin_local_llm::{LocalLlmPluginExt, SharedState};

            let api_base = if self.is_server_running().await {
                let state = self.state::<SharedState>();
                let guard = state.lock().await;
                guard.api_base.clone().unwrap()
            } else {
                self.start_server().await?
            };

            Ok(ConnectionLLM::HyprLocal(Connection {
                api_base,
                api_key: None,
            }))
        }
    }

    async fn get_stt_connection(&self) -> Result<ConnectionSTT, crate::Error> {
        {
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

                return Ok(ConnectionSTT::HyprCloud(Connection { api_base, api_key }));
            }
        }

        {
            use tauri_plugin_local_stt::{LocalSttPluginExt, SharedState};

            let api_base = if self.is_server_running().await {
                let state = self.state::<SharedState>();
                let guard = state.lock().await;
                guard.api_base.clone().unwrap()
            } else {
                self.start_server().await?
            };

            Ok(ConnectionSTT::HyprLocal(Connection {
                api_base,
                api_key: None,
            }))
        }
    }
}

#[allow(dead_code)]
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

trait OpenaiCompatible {
    fn models(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
}

impl OpenaiCompatible for ConnectionLLM {
    async fn models(&self) -> Result<Vec<String>, crate::Error> {
        let conn = self.as_ref();
        let api_base = &conn.api_base;

        let mut url = url::Url::parse(api_base)?;
        url.set_path("/v1/models");

        let res: serde_json::Value = reqwest::get(url.to_string()).await?.json().await?;
        let data = res["data"].as_array();

        let models = match data {
            None => vec![],
            Some(models) => models
                .iter()
                .map(|v| v["id"].as_str().unwrap().to_string())
                .collect(),
        };

        Ok(models)
    }
}
