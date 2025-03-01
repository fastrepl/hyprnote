use tauri::ipc::Channel;

use crate::{
    store,
    store::StoreKey,
    vault::{Vault, VaultKey},
    CALLBACK_TEMPLATE_KEY,
};

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type, schemars::JsonSchema)]
pub struct RequestParams {
    #[serde(rename = "c")]
    pub code: String,
    #[serde(rename = "f")]
    pub fingerprint: String,
    #[serde(rename = "p")]
    pub port: u16,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type, schemars::JsonSchema)]
pub struct ResponseParams {
    #[serde(rename = "ui")]
    pub user_id: String,
    #[serde(rename = "ai")]
    pub account_id: String,
    #[serde(rename = "st")]
    pub server_token: String,
    #[serde(rename = "dt")]
    pub database_token: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum AuthEvent {
    Success,
    Error,
}

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn start_oauth_server(&self, channel: Channel<AuthEvent>) -> Result<u16, String>;
    fn stop_oauth_server(&self, port: u16) -> Result<(), String>;
    fn init_vault(&self, account_id: impl AsRef<str>) -> Result<(), String>;
    fn reset_vault(&self) -> Result<(), String>;
    fn get_from_vault(&self, key: VaultKey) -> Result<Option<String>, String>;
    fn get_from_store(&self, key: StoreKey) -> Result<Option<String>, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn start_oauth_server(&self, channel: Channel<AuthEvent>) -> Result<u16, String> {
        let store = store::get_store(self);

        let env = self.state::<minijinja::Environment>().inner().clone();
        let vault = self.state::<Vault>().inner().clone();

        let response = env
            .get_template(CALLBACK_TEMPLATE_KEY)
            .map_err(|e| e.to_string())?
            .render(&serde_json::Map::new())
            .map_err(|e| e.to_string())?
            .into();

        let port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: None,
                response: Some(response),
            },
            move |u| {
                let search = url::Url::parse(&u)
                    .map_err(|e| e.to_string())
                    .and_then(|url| {
                        serde_qs::from_str::<ResponseParams>(url.query().unwrap_or(""))
                            .map_err(|e| e.to_string())
                    });

                match search {
                    Ok(params) => {
                        tracing::info!(params = ?params, "auth_callback");

                        vault.init(&params.account_id).unwrap();

                        for (key, value) in [
                            (StoreKey::UserId, params.user_id),
                            (StoreKey::AccountId, params.account_id),
                        ] {
                            store.set(key.as_ref(), value);
                        }

                        for (key, value) in [
                            (VaultKey::RemoteServer, params.server_token),
                            (VaultKey::RemoteDatabase, params.database_token),
                        ] {
                            vault.set(key, value).unwrap();
                        }

                        channel.send(AuthEvent::Success).unwrap();
                    }
                    Err(err) => {
                        tracing::error!(error = ?err, url = ?u, "failed_to_parse_callback_params");
                        channel.send(AuthEvent::Error).unwrap();
                    }
                }
            },
        )
        .map_err(|err| err.to_string())?;

        Ok(port)
    }

    fn stop_oauth_server(&self, port: u16) -> Result<(), String> {
        tauri_plugin_oauth::cancel(port).map_err(|err| err.to_string())
    }

    fn init_vault(&self, account_id: impl AsRef<str>) -> Result<(), String> {
        let vault = self.state::<Vault>();
        vault.init(account_id).map_err(|err| err.to_string())
    }

    fn reset_vault(&self) -> Result<(), String> {
        let vault = self.state::<Vault>();
        vault.clear().map_err(|err| err.to_string())
    }

    fn get_from_vault(&self, key: VaultKey) -> Result<Option<String>, String> {
        let vault = self.state::<Vault>();
        vault.get(key).map_err(|err| err.to_string())
    }

    fn get_from_store(&self, key: StoreKey) -> Result<Option<String>, String> {
        let store = store::get_store(self);

        let v = store.get(key).and_then(|v| {
            if let Some(s) = v.as_str() {
                Some(s.to_string())
            } else {
                None
            }
        });

        Ok(v)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qs() {
        assert!(serde_qs::from_str::<RequestParams>("c=123&f=456&p=789").is_ok());
        assert!(serde_qs::from_str::<RequestParams>(
            "http://localhost:8080/auth/connect?c=123&f=456&p=789"
        )
        .is_err())
    }
}
