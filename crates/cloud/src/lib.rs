use anyhow::Result;
use url::Url;

use futures_util::StreamExt;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

// use hypr_proto::protobuf::Message;
use hypr_proto::v0 as proto;

pub type TranscribeInputSender = mpsc::Sender<proto::TranscribeInputChunk>;
pub type TranscribeInputReceiver = mpsc::Receiver<proto::TranscribeInputChunk>;
pub type TranscribeOutputSender = mpsc::Sender<proto::TranscribeOutputChunk>;
pub type TranscribeOutputReceiver = mpsc::Receiver<proto::TranscribeOutputChunk>;

pub struct TranscribeHandler {
    input_sender: TranscribeInputSender,
    output_receiver: TranscribeOutputReceiver,
}

// TODO: we are splitting, for concurrent usage & send/receive in multiple threads.
// it makes no sense if we combine this two.
// we should return 2 struct, I think.

// TODO: periodical ping is needed.

impl TranscribeHandler {
    pub async fn tx(&self, value: proto::TranscribeInputChunk) -> Result<()> {
        self.input_sender
            .send(value)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub async fn rx(&mut self) -> Result<proto::TranscribeOutputChunk> {
        self.output_receiver.recv().await.ok_or(anyhow::anyhow!(""))
    }
}

pub struct Client {
    config: ClientConfig,
    reqwest_client: reqwest::Client,
}

pub struct ClientConfig {
    pub base_url: Url,
    pub auth_token: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum AuthKind {
    GoogleOAuth,
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

    pub async fn ws_connect(&mut self) -> Result<TranscribeHandler> {
        if self.config.auth_token.is_none() {
            anyhow::bail!("No auth token provided");
        }

        let (input_sender, mut input_receiver) = mpsc::channel::<proto::TranscribeInputChunk>(100);
        let (output_sender, output_receiver) = mpsc::channel::<proto::TranscribeOutputChunk>(100);

        let mut request = self.ws_url().to_string().into_client_request().unwrap();
        request.headers_mut().insert(
            "x-hypr-token",
            self.config.auth_token.clone().unwrap().parse().unwrap(),
        );

        let (ws_stream, _response) = tokio_tungstenite::connect_async(request).await?;
        let (write, read) = ws_stream.split();

        Ok(TranscribeHandler {
            input_sender,
            output_receiver,
        })
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
}
