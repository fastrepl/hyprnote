// https://github.com/tokio-rs/axum/blob/main/examples/websockets/src/client.rs
// https://github.com/snapview/tokio-tungstenite/blob/master/examples/client.rs

use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, http::Uri, protocol::Message, ClientRequestBuilder},
};

#[derive(Debug, Default)]
pub struct ClientBuilder {
    pub api_base: Option<String>,
    pub api_key: Option<String>,
}

impl ClientBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn build(self) -> Client {
        let mut url: url::Url = self.api_base.unwrap().parse().unwrap();
        url.set_path("/diarize");
        url.query_pairs_mut().append_pair("sample_rate", "16000");

        let uri = url.to_string().parse::<Uri>().unwrap();
        let request = ClientRequestBuilder::new(uri)
            .with_header("Authorization", format!("Bearer {}", self.api_key.unwrap()));

        Client { request }
    }
}

#[derive(Debug, Clone)]
pub struct Client {
    request: ClientRequestBuilder,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }

    pub async fn from_audio(&self, audio_stream: impl Stream<Item = f32> + Send + Unpin + 'static) {
        let req = self.request.clone().into_client_request().unwrap();

        let (_ws_stream, _) = connect_async(req).await.unwrap();
    }
}

pub struct DiarizeOutputChunk {
    pub speaker: u8,
    pub start: f32,
    pub end: f32,
}

#[derive(thiserror::Error, Debug)]
#[error(transparent)]
pub enum Error {
    TungsteniteError(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("Unknown error")]
    Unknown,
}
