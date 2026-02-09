use octocrab::Octocrab;
use secrecy::SecretString;

use crate::config::SupportConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: SupportConfig,
    pub(crate) octocrab: Octocrab,
}

impl AppState {
    pub(crate) fn new(config: SupportConfig) -> Self {
        let key = jsonwebtoken::EncodingKey::from_rsa_pem(
            config
                .github
                .github_bot_private_key
                .replace("\\n", "\n")
                .as_bytes(),
        )
        .expect("invalid GitHub App private key");

        let octocrab = Octocrab::builder()
            .app(config.github.github_bot_app_id.into(), key)
            .build()
            .expect("failed to build octocrab client");

        Self { config, octocrab }
    }

    pub(crate) async fn installation_client(&self) -> Result<Octocrab, octocrab::Error> {
        self.octocrab
            .installation(self.config.github.github_bot_installation_id.into())
    }

    pub(crate) async fn installation_token(&self) -> Result<SecretString, octocrab::Error> {
        let (_client, token) = self
            .octocrab
            .installation_and_token(self.config.github.github_bot_installation_id.into())
            .await?;
        Ok(token)
    }
}
