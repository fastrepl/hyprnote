use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use shuttle_service::{CustomError, Error, IntoResource, ResourceFactory, ResourceInputBuilder};

pub use hypr_stt;
pub use hypr_stt::{Client as STTClient, Config as STTConfig};

#[derive(Default, Serialize)]
pub struct STT {
    deepgram_api_key: Option<String>,
    clova_api_key: Option<String>,
}

impl STT {
    pub fn deepgram_api_key(mut self, api_key: &str) -> Self {
        self.deepgram_api_key = Some(api_key.to_string());
        self
    }

    pub fn clova_api_key(mut self, api_key: &str) -> Self {
        self.clova_api_key = Some(api_key.to_string());
        self
    }
}

#[derive(Serialize, Deserialize)]
pub struct Config {
    deepgram_api_key: String,
    clova_api_key: String,
}

#[async_trait]
impl ResourceInputBuilder for STT {
    type Input = Config;
    type Output = Config;

    async fn build(self, _factory: &ResourceFactory) -> Result<Self::Input, Error> {
        let deepgram_api_key = self
            .deepgram_api_key
            .ok_or(Error::Custom(CustomError::msg("Deepgram API key required")))?;

        let clova_api_key = self
            .clova_api_key
            .ok_or(Error::Custom(CustomError::msg("Clova API key required")))?;

        Ok(Config {
            deepgram_api_key,
            clova_api_key,
        })
    }
}

#[async_trait]
impl IntoResource<STTClient> for Config {
    async fn into_resource(self) -> Result<STTClient, Error> {
        Ok(STTClient {})
    }
}
