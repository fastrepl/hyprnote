use anyhow::Result;
use bytes::Bytes;

mod handle;
pub mod interface;

use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::{error::Error, str::FromStr};
use tonic::{
    metadata::{MetadataMap, MetadataValue},
    Request,
};

use interface::nest_service_client::NestServiceClient;

pub struct Client {
    inner: NestServiceClient<tonic::transport::Channel>,
    config: Config,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub secret_key: String,
    pub config: interface::ConfigRequest,
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
    pub async fn new(config: Config) -> Result<Self> {
        let channel =
            tonic::transport::Channel::from_static("https://clovaspeech-gw.ncloud.com:50051")
                .tls_config(tonic::transport::ClientTlsConfig::new())?
                .connect()
                .await?;

        let inner = NestServiceClient::new(channel);

        Ok(Self { inner, config })
    }

    fn auth<T>(&self, request: T) -> Request<T> {
        let mut req = Request::new(request);
        let mut metadata = MetadataMap::new();

        let auth_header = format!("Bearer {}", self.config.secret_key);
        let auth_value = MetadataValue::from_str(&auth_header).unwrap();

        // never capitalize authorization
        metadata.insert("authorization", auth_value);

        *req.metadata_mut() = metadata;
        req
    }

    async fn config_request(&mut self) -> Result<()> {
        let config = self.config.config.clone();

        let request = interface::NestRequest {
            r#type: interface::RequestType::Config.into(),
            part: Some(interface::nest_request::Part::Config(
                interface::NestConfig {
                    config: serde_json::to_string(&config).unwrap(),
                },
            )),
        };

        let request = self.auth(request);
        let response = self
            .inner
            .recognize(tonic::Request::new(futures::stream::once(async {
                request.into_inner()
            })))
            .await?;

        let mut stream = response.into_inner();

        while let Some(message) = stream.message().await? {
            let res: interface::ConfigResponse = serde_json::from_str(&message.contents)?;

            if res.config.status != interface::ConfigResponseStatus::Success {
                return Err(anyhow::anyhow!("config request failed"));
            }
        }

        Ok(())
    }

    pub async fn stream<S, E>(
        &mut self,
        stream: S,
    ) -> Result<impl Stream<Item = Result<interface::StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        self.config_request().await?;

        let request_stream = stream.filter_map(|chunk| async {
            if let Ok(chunk) = chunk {
                Some(interface::NestRequest {
                    r#type: interface::RequestType::Data.into(),
                    part: Some(interface::nest_request::Part::Data(interface::NestData {
                        chunk: chunk.to_vec(),
                        extra_contents: "".to_string(),
                    })),
                })
            } else {
                None
            }
        });

        let response = self
            .inner
            .recognize(request_stream)
            .await?
            .into_inner()
            .map(|message| {
                let res = serde_json::from_str::<interface::StreamResponse>(&message?.contents)?;
                Ok(res)
            });

        Ok(response)
    }
}
