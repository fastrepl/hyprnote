use anyhow::Result;
use url::Url;

use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

pub struct Client {
    config: ClientConfig,
    reqwest_client: reqwest::Client,
}

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub base_url: Url,
    pub auth_token: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum AuthKind {
    GoogleOAuth,
}

type WebsocketStream =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

type SenderStream =
    futures_util::stream::SplitSink<WebsocketStream, tokio_tungstenite::tungstenite::Message>;

type ReceiverStream = futures_util::stream::SplitStream<WebsocketStream>;

pub struct Sender {
    stream: SenderStream,
}

impl Sender {
    pub fn new(stream: SenderStream) -> Self {
        Self { stream }
    }

    // pub async fn run(&mut self, chunk: proto::TranscribeInputChunk) -> Result<()> {
    //     let bytes = chunk.write_to_bytes()?;
    //     let msg = tokio_tungstenite::tungstenite::Message::binary(bytes);
    //     self.stream.send(msg).await?;
    //     Ok(())
    // }
}

pub struct Receiver {
    stream: ReceiverStream,
}

impl Receiver {
    pub fn new(stream: ReceiverStream) -> Self {
        Self { stream }
    }

    // pub async fn run(&mut self) -> Result<proto::TranscribeOutputChunk> {
    //     let msg = self.stream.next().await.unwrap()?;
    //     let bytes = msg.into_data();
    //     let chunk = proto::TranscribeOutputChunk::parse_from_bytes(&bytes)?;
    //     Ok(chunk)
    // }
}

impl Client {
    pub fn new(config: ClientConfig) -> Self {
        let client = reqwest::Client::new();

        Self {
            config,
            reqwest_client: client,
        }
    }

    pub fn get_authentication_url(&self, kind: AuthKind) -> Url {
        match kind {
            AuthKind::GoogleOAuth => {
                let mut url = self.config.base_url.clone();
                url.set_path("/auth/desktop/login/google");
                url
            }
        }
    }

    pub async fn ws_connect(&mut self) -> Result<(Sender, Receiver)> {
        let mut request = self.ws_url().to_string().into_client_request().unwrap();
        if let Some(token) = self.config.auth_token.clone() {
            request
                .headers_mut()
                .insert("x-hypr-token", token.parse().unwrap());
        }

        let (ws_stream, _response) = tokio_tungstenite::connect_async(request).await?;
        let (write, read) = ws_stream.split();

        Ok((Sender { stream: write }, Receiver { stream: read }))
    }

    pub fn ws_disconnect(&mut self) -> Result<()> {
        Ok(())
    }

    pub async fn enhance_note(self, note: hypr_db::types::Session) -> Result<()> {
        let _ = self
            .reqwest_client
            .post(self.enhance_url())
            .json(&note)
            .send()
            .await?;

        Ok(())
    }

    fn enhance_url(&self) -> Url {
        let mut url = self.config.base_url.clone();
        url.set_path("/enhance");
        url
    }

    fn ws_url(&self) -> Url {
        let mut url = self.config.base_url.clone();

        if self.config.base_url.scheme() == "http" {
            url.set_scheme("ws").unwrap();
        } else {
            url.set_scheme("wss").unwrap();
        }

        url
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simple() {
        let _ = Client::new(ClientConfig {
            base_url: Url::parse("http://localhost:8080").unwrap(),
            auth_token: Some("".to_string()),
        });
    }

    #[tokio::test]
    async fn test_ws_connect() -> Result<()> {
        let mut client = Client::new(ClientConfig {
            base_url: Url::parse("ws://ws.vi-server.org/mirror").unwrap(),
            auth_token: None,
        });

        let (mut sender, mut receiver) = client.ws_connect().await?;

        // let input = proto::TranscribeInputChunk::default();
        // sender.run(input.clone()).await?;
        // let output = receiver.run().await?;

        // assert_eq!(input.write_to_bytes()?, output.write_to_bytes()?);
        Ok(())
    }
}
