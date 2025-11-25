use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tauri_specta::Event;

use crate::{
    events::AuthEvent,
    store::{self, StoreKey},
    vault::{Vault, VaultKey},
    ResponseParams, CALLBACK_TEMPLATE_KEY,
};

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn start_oauth_server(&self) -> Result<u16, crate::Error>;
    fn stop_oauth_server(&self, port: u16) -> Result<(), crate::Error>;
    fn init_vault(&self, account_id: impl AsRef<str>) -> Result<(), crate::Error>;
    fn reset_vault(&self) -> Result<(), crate::Error>;
    fn get_from_vault(&self, key: VaultKey) -> Result<Option<String>, crate::Error>;
    fn get_from_store(&self, key: StoreKey) -> Result<Option<String>, crate::Error>;
    fn set_in_vault(&self, key: VaultKey, value: impl Into<String>) -> Result<(), crate::Error>;
    fn set_in_store(&self, key: StoreKey, value: impl Into<String>) -> Result<(), crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn start_oauth_server(&self) -> Result<u16, crate::Error> {
        let app = self.app_handle().clone();
        let store = store::get_store(self);
        let vault = self.state::<Vault>().inner().clone();

        let env = self.state::<minijinja::Environment>().inner().clone();
        let html = generate_html(&env)?;

        let port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: None,
                response: Some(html.into()),
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

                        vault.init(&params.user_id).unwrap();

                        for (key, value) in [
                            (VaultKey::RemoteServer, params.server_token),
                            (VaultKey::RemoteDatabase, params.database_token),
                        ] {
                            vault.set(key, value).unwrap();
                        }

                        for (key, value) in [
                            (StoreKey::UserId, params.user_id),
                            (StoreKey::AccountId, params.account_id),
                        ] {
                            store.set(key.as_ref(), value);
                        }
                        store.save().unwrap();

                        AuthEvent::Success.emit(&app).unwrap();
                    }
                    Err(err) => {
                        tracing::error!(error = ?err, url = ?u, "failed_to_parse_callback_params");
                        AuthEvent::Error(err.to_string()).emit(&app).unwrap();
                    }
                }
            },
        )?;

        Ok(port)
    }

    fn stop_oauth_server(&self, port: u16) -> Result<(), crate::Error> {
        tauri_plugin_oauth::cancel(port)?;
        Ok(())
    }

    fn init_vault(&self, user_id: impl AsRef<str>) -> Result<(), crate::Error> {
        let vault = self.state::<Vault>();
        vault.init(user_id)
    }

    fn reset_vault(&self) -> Result<(), crate::Error> {
        let vault = self.state::<Vault>();
        vault.clear()
    }

    fn get_from_vault(&self, key: VaultKey) -> Result<Option<String>, crate::Error> {
        let vault = self.state::<Vault>();
        vault.get(key)
    }

    fn get_from_store(&self, key: StoreKey) -> Result<Option<String>, crate::Error> {
        let store = store::get_store(self);

        let v = store
            .get(key)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        Ok(v)
    }

    fn set_in_vault(&self, key: VaultKey, value: impl Into<String>) -> Result<(), crate::Error> {
        let vault = self.state::<Vault>();
        vault.set(key, value)
    }

    fn set_in_store(&self, key: StoreKey, value: impl Into<String>) -> Result<(), crate::Error> {
        let store = store::get_store(self);
        store.set(key.as_ref(), serde_json::Value::String(value.into()));
        store.save()?;

        Ok(())
    }
}

const KEYCHAIN_SAVE_PNG: &[u8] = include_bytes!("../assets/keychain_save.png");

pub(crate) fn generate_html(env: &minijinja::Environment) -> Result<String, crate::Error> {
    let mut context = serde_json::Map::new();
    context.insert(
        "keychain_img_src".into(),
        format!("data:image/png;base64,{}", BASE64.encode(KEYCHAIN_SAVE_PNG)).into(),
    );

    let response = env.get_template(CALLBACK_TEMPLATE_KEY)?.render(&context)?;
    Ok(response)
}

#[cfg(test)]
mod tests {
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
