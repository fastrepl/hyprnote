use anyhow::Result;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite;
use url::Url;

use hypr_proto::protobuf::Message;
use hypr_proto::v0 as proto;

pub type TranscribeInputSender = mpsc::Sender<proto::TranscribeInputChunk>;
pub type TranscribeInputReceiver = mpsc::Receiver<proto::TranscribeInputChunk>;
pub type TranscribeOutputSender = mpsc::Sender<proto::TranscribeOutputChunk>;
pub type TranscribeOutputReceiver = mpsc::Receiver<proto::TranscribeOutputChunk>;

pub struct TranscribeHandler {
    input_sender: TranscribeInputSender,
    output_receiver: TranscribeOutputReceiver,
}

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

struct WebsocketClient {
    output_sender: TranscribeOutputSender,
}

pub struct Client {
    config: ClientConfig,
    reqwest_client: reqwest::Client,
}

pub struct ClientConfig {
    base_url: Url,
    auth_token: String,
}

impl Client {
    pub fn new(config: ClientConfig) -> Self {
        let client = reqwest::Client::new();

        Self {
            config,
            reqwest_client: client,
        }
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

    pub async fn ws_connect(&mut self) -> Result<TranscribeHandler> {
        let (input_sender, mut input_receiver) = mpsc::channel::<proto::TranscribeInputChunk>(100);
        let (output_sender, output_receiver) = mpsc::channel::<proto::TranscribeOutputChunk>(100);

        let request =
            tungstenite::ClientRequestBuilder::new(self.ws_url().to_string().parse().unwrap())
                .with_header("x-hypr-token", &self.config.auth_token);

        let (stream, response) = tokio_tungstenite::connect_async(request).await?;

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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simple() {
        let _ = Client::new(ClientConfig {
            base_url: Url::parse("http://localhost:8080").unwrap(),
            auth_token: "".to_string(),
        });
    }
}
