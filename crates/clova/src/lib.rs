pub mod interface;
use interface::nest_service_client::NestServiceClient;

use serde::{Deserialize, Serialize};

pub struct Client {
    inner: NestServiceClient<tonic::transport::Channel>,
    config: Config,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    secret_key: String,
    config: interface::ConfigRequest,
}

impl Config {
    pub fn from_key_and_language(key: &str, language: interface::Language) -> Self {
        Self {
            secret_key: key.to_string(),
            config: interface::ConfigRequest {
                transcription: interface::Transcription { language },
            },
        }
    }
}

impl Client {
    pub async fn new(config: Config) -> Result<Self, tonic::transport::Error> {
        let channel =
            tonic::transport::Channel::from_static("https://clovaspeech-gw.ncloud.com:50051")
                .tls_config(tonic::transport::ClientTlsConfig::new())?
                .connect()
                .await?;

        let inner = NestServiceClient::new(channel);

        Ok(Self { inner, config })
    }
}
