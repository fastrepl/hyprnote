use anyhow::Result;
use async_trait::async_trait;
use tokio::sync::mpsc;
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

#[async_trait]
impl ezsockets::ClientExt for WebsocketClient {
    // https://docs.rs/ezsockets/latest/ezsockets/client/trait.ClientExt.html
    type Call = ();

    async fn on_text(&mut self, _text: String) -> Result<(), ezsockets::Error> {
        Ok(())
    }

    async fn on_binary(&mut self, bytes: Vec<u8>) -> Result<(), ezsockets::Error> {
        let data = proto::TranscribeOutputChunk::parse_from_bytes(&bytes).unwrap();
        let _ = self.output_sender.send(data).await;
        Ok(())
    }

    async fn on_call(&mut self, _call: Self::Call) -> Result<(), ezsockets::Error> {
        Ok(())
    }
}

pub struct Client {
    config: ClientConfig,
    reqwest_client: reqwest::Client,
    ws_client: Option<ezsockets::Client<WebsocketClient>>,
}

pub struct ClientConfig {
    base_url: Url,
}

impl Client {
    pub fn new(config: ClientConfig) -> Self {
        let client = reqwest::Client::new();

        Self {
            config,
            reqwest_client: client,
            ws_client: None,
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

        let config = ezsockets::ClientConfig::new(self.ws_url().as_str());

        let (handle, future) =
            ezsockets::connect(|_client| WebsocketClient { output_sender }, config).await;

        tokio::spawn(async move {
            while let Some(input) = input_receiver.recv().await {
                let _ = handle.binary(input.audio);
            }
            future.await.unwrap();
        });

        Ok(TranscribeHandler {
            input_sender,
            output_receiver,
        })
    }

    pub fn ws_disconnect(&mut self) -> Result<()> {
        self.ws_client.take().unwrap().close(None)?;
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
        });
    }
}
