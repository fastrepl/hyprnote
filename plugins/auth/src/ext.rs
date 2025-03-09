use tauri::ipc::Channel;

use crate::{
    store,
    store::AuthStoreKey,
    vault::{Vault, VaultKey},
    ResponseParams, CALLBACK_TEMPLATE_KEY,
};

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
    fn get_from_store(&self, key: AuthStoreKey) -> Result<Option<String>, String>;
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
                            (VaultKey::RemoteServer, params.server_token),
                            (VaultKey::RemoteDatabase, params.database_token),
                        ] {
                            vault.set(key, value).unwrap();
                        }

                        for (key, value) in [
                            (AuthStoreKey::UserId, params.user_id),
                            (AuthStoreKey::AccountId, params.account_id),
                        ] {
                            store.set(key.as_ref(), value);
                        }
                        store.save().unwrap();

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

    fn get_from_store(&self, key: AuthStoreKey) -> Result<Option<String>, String> {
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
    use crate::RequestParams;

    #[test]
    fn test_qs() {
        assert!(serde_qs::from_str::<RequestParams>("c=123&f=456&p=789").is_ok());
        assert!(serde_qs::from_str::<RequestParams>(
            "http://localhost:8080/auth/connect?c=123&f=456&p=789"
        )
        .is_err())
    }
}
