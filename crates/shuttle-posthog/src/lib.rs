use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use shuttle_service::{CustomError, Error, IntoResource, ResourceFactory, ResourceInputBuilder};

pub use posthog_rs;
use posthog_rs::Client;

#[derive(Default, Serialize)]
pub struct Posthog {
    api_key: Option<String>,
}

impl Posthog {
    pub fn api_key(mut self, api_key: &str) -> Self {
        self.api_key = Some(api_key.to_string());
        self
    }
}

#[derive(Serialize, Deserialize)]
pub struct Config {
    api_key: String,
}

#[async_trait]
impl ResourceInputBuilder for Posthog {
    type Input = Config;
    type Output = Config;

    async fn build(self, _factory: &ResourceFactory) -> Result<Self::Input, Error> {
        let api_key = self
            .api_key
            .ok_or(Error::Custom(CustomError::msg("Posthog API key required")))?;

        Ok(Config { api_key })
    }
}

#[async_trait]
impl IntoResource<Client> for Config {
    async fn into_resource(self) -> Result<Client, Error> {
        let options = posthog_rs::ClientOptions::from(self.api_key.as_str());
        let client = posthog_rs::client(options);

        Ok(client)
    }
}
