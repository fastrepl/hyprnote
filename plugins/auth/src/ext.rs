use crate::{
    vault::{Key, Vault},
    CALLBACK_TEMPLATE_KEY,
};

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct RequestParams {
    #[serde(rename = "c")]
    pub code: String,
    #[serde(rename = "f")]
    pub fingerprint: String,
    #[serde(rename = "p")]
    pub port: u16,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ResponseParams {
    #[serde(rename = "k")]
    pub token: String,
    #[serde(rename = "u")]
    pub user_id: String,
}

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn start_oauth_server(&self) -> Result<u16, String>;
    fn stop_oauth_server(&self, port: u16) -> Result<(), String>;
    fn reset_vault(&self) -> Result<(), String>;
    fn get_from_vault(&self, key: Key) -> Result<Option<String>, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn start_oauth_server(&self) -> Result<u16, String> {
        let env = self.state::<minijinja::Environment>().inner().clone();
        let vault = self.state::<Vault>().inner().clone();

        let response = env
            .render_str(CALLBACK_TEMPLATE_KEY, &serde_json::Map::new())
            .unwrap()
            .into();

        let port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: None,
                response: Some(response),
            },
            move |url| match serde_qs::from_str::<ResponseParams>(&url) {
                Ok(params) => {
                    tracing::info!(params = ?params, "auth_callback");
                    vault.set(Key::RemoteServer, params.token).unwrap();
                    vault.set(Key::UserId, params.user_id).unwrap();
                }
                Err(err) => {
                    tracing::error!("failed_to_parse_callback_params: {}", err);
                }
            },
        )
        .map_err(|err| err.to_string())?;

        Ok(port)
    }

    fn stop_oauth_server(&self, port: u16) -> Result<(), String> {
        tauri_plugin_oauth::cancel(port).map_err(|err| err.to_string())
    }

    fn reset_vault(&self) -> Result<(), String> {
        let vault = self.state::<Vault>();
        vault.clear().map_err(|err| err.to_string())
    }

    fn get_from_vault(&self, key: Key) -> Result<Option<String>, String> {
        let vault = self.state::<Vault>();
        vault.get(key).map_err(|err| err.to_string())
    }
}
