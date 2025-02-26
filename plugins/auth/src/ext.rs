use crate::{
    vault::{Key, Vault},
    SharedState, CALLBACK_TEMPLATE_KEY,
};

#[derive(Debug, serde::Deserialize)]
pub struct CallbackParams {
    #[serde(rename = "k")]
    pub token: String,
    #[serde(rename = "u")]
    pub user_id: String,
}

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn start_oauth_server(&self) -> Result<(), String>;
    fn stop_oauth_server(&self) -> Result<(), String>;
    fn reset_vault(&self) -> Result<(), String>;
    fn get_from_vault(&self, key: Key) -> Result<String, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn start_oauth_server(&self) -> Result<(), String> {
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
            move |url| match serde_qs::from_str::<CallbackParams>(&url) {
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

        {
            let state = self.state::<SharedState>();
            let mut s = state.lock().unwrap();
            s.oauth_server_port = Some(port);
        }

        Ok(())
    }

    fn stop_oauth_server(&self) -> Result<(), String> {
        let port = {
            let state = self.state::<SharedState>();
            let mut s = state.lock().unwrap();
            s.oauth_server_port.take()
        };

        if let Some(port) = port {
            tauri_plugin_oauth::cancel(port).map_err(|err| err.to_string())?;
        }

        Ok(())
    }

    fn reset_vault(&self) -> Result<(), String> {
        let vault = self.state::<Vault>();
        vault.clear().map_err(|err| err.to_string())
    }

    fn get_from_vault(&self, key: Key) -> Result<String, String> {
        let vault = self.state::<Vault>();
        vault.get(key).map_err(|err| err.to_string())
    }
}
