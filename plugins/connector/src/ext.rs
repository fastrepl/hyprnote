use std::future::Future;

use crate::{Connection, ConnectionLLM, ConnectionSTT, StoreKey};
use tauri_plugin_store2::StorePluginExt;

pub trait ConnectorPluginExt<R: tauri::Runtime> {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn list_custom_llm_models(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;

    fn get_custom_llm_model(&self) -> Result<Option<String>, crate::Error>;
    fn set_custom_llm_model(&self, model: String) -> Result<(), crate::Error>;

    fn set_custom_llm_enabled(&self, enabled: bool) -> Result<(), crate::Error>;
    fn get_custom_llm_enabled(&self) -> Result<bool, crate::Error>;

    fn get_local_llm_connection(&self)
        -> impl Future<Output = Result<ConnectionLLM, crate::Error>>;

    fn get_custom_llm_connection(&self) -> Result<Option<Connection>, crate::Error>;
    fn set_custom_llm_connection(&self, connection: Connection) -> Result<(), crate::Error>;

    fn get_llm_connection(&self) -> impl Future<Output = Result<ConnectionLLM, crate::Error>>;
    fn get_stt_connection(&self) -> impl Future<Output = Result<ConnectionSTT, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ConnectorPluginExt<R> for T {
    fn connector_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    async fn list_custom_llm_models(&self) -> Result<Vec<String>, crate::Error> {
        let conn = self.get_custom_llm_connection()?;

        match conn {
            Some(c) => {
                let llm_conn = ConnectionLLM::Custom(Connection {
                    api_base: c.api_base,
                    api_key: c.api_key,
                });

                llm_conn.models().await
            }
            _ => Ok(vec![]),
        }
    }

    fn get_custom_llm_model(&self) -> Result<Option<String>, crate::Error> {
        Ok(self.connector_store().get(StoreKey::CustomModel)?.flatten())
    }

    fn set_custom_llm_model(&self, model: String) -> Result<(), crate::Error> {
        self.connector_store().set(StoreKey::CustomModel, model)?;
        Ok(())
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

    async fn get_local_llm_connection(&self) -> Result<ConnectionLLM, crate::Error> {
        use tauri_plugin_local_llm::{LocalLlmPluginExt, SharedState};

        let api_base = if self.is_server_running().await {
            let state = self.state::<SharedState>();
            let guard = state.lock().await;
            guard.api_base.clone().unwrap()
        } else {
            self.start_server().await?
        };

        let conn = ConnectionLLM::HyprLocal(Connection {
            api_base,
            api_key: None,
        });
        Ok(conn)
    }

    async fn get_llm_connection(&self) -> Result<ConnectionLLM, crate::Error> {
        {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey};

            if self
                .get_from_store(StoreKey::Plan)?
                .unwrap_or("free".to_string())
                == "pro".to_string()
            {
                let api_base = if cfg!(debug_assertions) {
                    "http://127.0.0.1:1234".to_string()
                } else {
                    "https://app.hyprnote.com".to_string()
                };

                return Ok(ConnectionLLM::HyprCloud(Connection {
                    api_base,
                    api_key: None,
                }));
            }
        }

        {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey, VaultKey};

            if let Ok(Some(_)) = self.get_from_store(StoreKey::AccountId) {
                let api_base = if cfg!(debug_assertions) {
                    "http://127.0.0.1:1234".to_string()
                } else {
                    "https://app.hyprnote.com".to_string()
                };

                let api_key = if cfg!(debug_assertions) {
                    None
                } else {
                    self.get_from_vault(VaultKey::RemoteServer)?
                };

                let conn = ConnectionLLM::HyprCloud(Connection { api_base, api_key });
                return Ok(conn);
            }
        }

        let store = self.connector_store();
        let custom_enabled = self.get_custom_llm_enabled()?;

        if custom_enabled {
            let api_base = store
                .get::<Option<String>>(StoreKey::CustomApiBase)?
                .flatten()
                .unwrap();
            let api_key = store
                .get::<Option<String>>(StoreKey::CustomApiKey)?
                .flatten();

            let conn = ConnectionLLM::Custom(Connection { api_base, api_key });
            Ok(conn)
        } else {
            let conn = self.get_local_llm_connection().await?;
            Ok(conn)
        }
    }

    async fn get_stt_connection(&self) -> Result<ConnectionSTT, crate::Error> {
        {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey};

            if self
                .get_from_store(StoreKey::Plan)?
                .unwrap_or("free".to_string())
                == "pro".to_string()
            {
                let api_base = if cfg!(debug_assertions) {
                    "http://127.0.0.1:1234".to_string()
                } else {
                    "https://app.hyprnote.com".to_string()
                };

                return Ok(ConnectionSTT::HyprCloud(Connection {
                    api_base,
                    api_key: None,
                }));
            }
        }

        {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey, VaultKey};

            if let Ok(Some(_)) = self.get_from_store(StoreKey::AccountId) {
                let api_base = if cfg!(debug_assertions) {
                    "http://127.0.0.1:1234".to_string()
                } else {
                    "https://app.hyprnote.com".to_string()
                };

                let api_key = if cfg!(debug_assertions) {
                    None
                } else {
                    self.get_from_vault(VaultKey::RemoteServer)?
                };

                let conn = ConnectionSTT::HyprCloud(Connection { api_base, api_key });
                return Ok(conn);
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

            let conn = ConnectionSTT::HyprLocal(Connection {
                api_base,
                api_key: None,
            });
            Ok(conn)
        }
    }
}

trait OpenaiCompatible {
    fn models(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
}

impl OpenaiCompatible for ConnectionLLM {
    async fn models(&self) -> Result<Vec<String>, crate::Error> {
        let conn = self.as_ref();
        let api_base = &conn.api_base;
        let api_key = &conn.api_key;

        let url = {
            let mut u = url::Url::parse(api_base)?;
            u.set_path("/v1/models");
            u
        };

        let mut req = reqwest::Client::new().get(url);
        if let Some(api_key) = api_key {
            req = req.bearer_auth(api_key);
        }

        let res: serde_json::Value = req.send().await?.json().await?;
        let data = res["data"].as_array();
        let models = match data {
            None => return Err(crate::Error::UnknownError(format!("no_models: {:?}", res))),
            Some(models) => models
                .iter()
                .filter_map(|v| v["id"].as_str().map(String::from))
                .filter(|id| {
                    ![
                        "audio",
                        "video",
                        "image",
                        "tts",
                        "dall-e",
                        "moderation",
                        "transcribe",
                        "embedding",
                    ]
                    .iter()
                    .any(|&excluded| id.contains(excluded))
                })
                .collect(),
        };

        Ok(models)
    }
}
