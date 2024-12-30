mod handle;
pub mod interface;

use anyhow::Result;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::error::Error;

use interface::nest_service_client::NestServiceClient;
use tonic::{service::interceptor::InterceptedService, transport::Channel, Request, Status};

// https://docs.rs/tonic/latest/tonic/service/trait.Interceptor.html
type Interceptor = Box<dyn FnMut(Request<()>) -> Result<Request<()>, Status>>;

pub struct Client {
    inner: NestServiceClient<InterceptedService<Channel, Interceptor>>,
    config: Config,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub secret_key: String,
    pub config: interface::ConfigRequest,
}

impl Client {
    pub async fn new(config: Config) -> Result<Self> {
        let channel =
            tonic::transport::Channel::from_static("https://clovaspeech-gw.ncloud.com:50051")
                .tls_config(tonic::transport::ClientTlsConfig::new().with_native_roots())?
                .connect()
                .await?;

        let key = config.secret_key.clone();
        let inner = NestServiceClient::with_interceptor(channel, Self::make_interceptor(key));

        Ok(Self { inner, config })
    }

    fn make_interceptor(secret_key: String) -> Interceptor {
        Box::new(move |mut req: Request<()>| {
            req.metadata_mut()
                // lowercase is required
                .insert("authorization", secret_key.parse().unwrap());
            Ok(req)
        })
    }

    pub async fn stream<S, E>(
        &mut self,
        stream: S,
    ) -> Result<impl Stream<Item = Result<interface::StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let config = serde_json::to_string(&self.config.config).unwrap();
        let config_request = interface::NestRequest {
            r#type: interface::RequestType::Config.into(),
            part: Some(interface::nest_request::Part::Config(
                interface::NestConfig { config },
            )),
        };
        let config_stream = futures::stream::once(async move { config_request });

        let audio_request_stream = stream.filter_map(|chunk| async {
            if let Ok(chunk) = chunk {
                Some(interface::NestRequest {
                    r#type: interface::RequestType::Data.into(),
                    part: Some(interface::nest_request::Part::Data(interface::NestData {
                        chunk: chunk.into(),
                        extra_contents: r#"{"seqId": 0, "epFlag": false}"#.to_string(),
                    })),
                })
            } else {
                None
            }
        });

        let response = self
            .inner
            .recognize(config_stream.chain(audio_request_stream))
            .await?
            .into_inner()
            .map(|message| {
                let res = serde_json::from_str::<interface::StreamResponse>(&message?.contents)?;
                Ok(res)
            });

        Ok(response)
    }
}
