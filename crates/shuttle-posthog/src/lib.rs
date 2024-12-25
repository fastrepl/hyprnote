use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use shuttle_service::{CustomError, Error, IntoResource, ResourceFactory, ResourceInputBuilder};

pub use posthog;
use posthog::Client;

#[derive(Default, Serialize)]
pub struct Posthog {
    api_base: Option<String>,
    api_key: Option<String>,
}

impl Posthog {
    pub fn api_base(mut self, api_base: &str) -> Self {
        self.api_base = Some(api_base.to_string());
        self
    }

    pub fn api_key(mut self, api_key: &str) -> Self {
        self.api_key = Some(api_key.to_string());
        self
    }
}

#[derive(Serialize, Deserialize)]
pub struct Config {
    api_key: String,
    api_base: String,
}

#[async_trait]
impl ResourceInputBuilder for Posthog {
    type Input = Config;
    type Output = Config;

    async fn build(self, _factory: &ResourceFactory) -> Result<Self::Input, Error> {
        let api_base = self
            .api_base
            .ok_or(Error::Custom(CustomError::msg("'api_base' is required")))?;

        let api_key = self
            .api_key
            .ok_or(Error::Custom(CustomError::msg("'api_key' is required")))?;

        Ok(Config { api_base, api_key })
    }
}

#[async_trait]
impl IntoResource<Client> for Config {
    async fn into_resource(self) -> Result<Client, Error> {
        let options = posthog::ClientOptions::new(
            self.api_key,
            self.api_base,
            std::time::Duration::from_secs(10),
        );

        Ok(posthog::client(options))
    }
}
