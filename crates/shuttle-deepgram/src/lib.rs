use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use shuttle_service::{CustomError, Error, IntoResource, ResourceFactory, ResourceInputBuilder};

pub use deepgram;
use deepgram::Deepgram as Client;

#[derive(Default, Serialize)]
pub struct Deepgram {
    api_key: Option<String>,
}

impl Deepgram {
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
impl ResourceInputBuilder for Deepgram {
    type Input = Config;
    type Output = Config;

    async fn build(self, _factory: &ResourceFactory) -> Result<Self::Input, Error> {
        let api_key = self
            .api_key
            .ok_or(Error::Custom(CustomError::msg("Deepgram API key required")))?;

        Ok(Config { api_key })
    }
}

#[async_trait]
impl IntoResource<Client> for Config {
    async fn into_resource(self) -> Result<Client, Error> {
        let client = Client::with_base_url_and_api_key("https://api.deepgram.com", self.api_key)
            .map_err(|e| Error::Custom(CustomError::msg(e.to_string())))?;

        Ok(client)
    }
}
