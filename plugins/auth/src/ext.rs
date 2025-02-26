use crate::vault::{Key, Vault};

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn start_oauth_server(&self) -> Result<u16, String>;
    fn cancel_oauth_server(&self) -> Result<(), String>;
    fn get_from_vault(&self, key: &str) -> Result<String, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn start_oauth_server(&self) -> Result<u16, String> {
        let env = self.state::<minijinja::Environment>().inner().clone();
        let vault = self.state::<Vault>().inner().clone();

        let response = env
            .render_str("callback", &serde_json::Map::new())
            .unwrap()
            .into();

        let port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: None,
                response: Some(response),
            },
            move |url| {
                let parsed_url = url::Url::parse(&url).unwrap();
                let query_pairs: Vec<_> = parsed_url.query_pairs().collect();

                let token = query_pairs
                    .iter()
                    .find(|(k, _)| k == "k")
                    .map(|(_, v)| v.to_string());

                let user_id = query_pairs
                    .iter()
                    .find(|(k, _)| k == "u")
                    .map(|(_, v)| v.to_string());

                tracing::info!(
                    url = ?url,
                    token = ?token,
                    user_id = ?user_id,
                    "oauth_callback"
                );

                if let (Some(token), Some(user_id)) = (token, user_id) {
                    vault.set(Key::RemoteServer, token).unwrap();
                    vault.set(Key::UserId, user_id).unwrap();
                } else {
                    tracing::error!("oauth_callback: Missing token or user_id");
                }
            },
        )
        .map_err(|err| err.to_string())?;

        Ok(port)
    }

    fn cancel_oauth_server(&self) -> Result<(), String> {
        Ok(())
    }

    fn get_from_vault(&self, key: &str) -> Result<String, String> {
        todo!()
    }
}
