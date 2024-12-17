use anyhow::Result;
use async_trait::async_trait;
use tokio::sync::mpsc;
use url::Url;

use hypr_proto::v0 as proto;

pub type TranscribeInputSender = mpsc::Sender<proto::TranscribeInputChunk>;
pub type TranscribeInputReceiver = mpsc::Receiver<proto::TranscribeInputChunk>;
pub type TranscribeOutputSender = mpsc::Sender<proto::TranscribeOutputChunk>;
pub type TranscribeOutputReceiver = mpsc::Receiver<proto::TranscribeOutputChunk>;

pub struct TranscribeHandler {
    pub input_tx: TranscribeInputSender,
    pub output_rx: TranscribeOutputReceiver,
}

struct WebsocketClient {
    output_tx: TranscribeOutputSender,
}

#[async_trait]
impl ezsockets::ClientExt for WebsocketClient {
    // https://docs.rs/ezsockets/latest/ezsockets/client/trait.ClientExt.html
    type Call = ();

    async fn on_text(&mut self, _text: String) -> Result<(), ezsockets::Error> {
        Ok(())
    }

    async fn on_binary(&mut self, bytes: Vec<u8>) -> Result<(), ezsockets::Error> {
        let mut data = proto::TranscribeOutputChunk::new();
        data.text = String::from_utf8(bytes).unwrap(); // TODO

        let _ = self.output_tx.send(data).await;
        Ok(())
    }

    async fn on_call(&mut self, call: Self::Call) -> Result<(), ezsockets::Error> {
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
        let (input_tx, mut input_rx) = mpsc::channel::<proto::TranscribeInputChunk>(10);
        let (output_tx, output_rx) = mpsc::channel::<proto::TranscribeOutputChunk>(10);

        let config = ezsockets::ClientConfig::new(self.ws_url().as_str());

        let (handle, future) =
            ezsockets::connect(|_client| WebsocketClient { output_tx }, config).await;

        tokio::spawn(async move {
            while let Some(input) = input_rx.recv().await {
                let _ = handle.binary(input.audio);
            }
            future.await.unwrap();
        });

        Ok(TranscribeHandler {
            input_tx,
            output_rx,
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
