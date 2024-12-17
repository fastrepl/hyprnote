use anyhow::Result;
use async_trait::async_trait;
use url::Url;

struct WebsocketClient {}

#[async_trait]
impl ezsockets::ClientExt for WebsocketClient {
    type Call = ();

    async fn on_text(&mut self, text: String) -> Result<(), ezsockets::Error> {
        Ok(())
    }

    async fn on_binary(&mut self, bytes: Vec<u8>) -> Result<(), ezsockets::Error> {
        Ok(())
    }

    async fn on_call(&mut self, call: Self::Call) -> Result<(), ezsockets::Error> {
        let () = call;
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

    pub async fn ws_connect(&mut self) -> Result<()> {
        let config = ezsockets::ClientConfig::new(self.ws_url().as_str());

        let (handle, future) = ezsockets::connect(|_client| WebsocketClient {}, config).await;
        tokio::spawn(async move {
            future.await.unwrap();
        });
        self.ws_client = Some(handle);

        Ok(())
    }

    pub fn ws_disconnect(&mut self) -> Result<()> {
        self.ws_client.take().unwrap().close(None)?;
        Ok(())
    }

    pub fn ws_send(&mut self, bytes: &[u8]) -> Result<()> {
        self.ws_client.take().unwrap().binary(bytes)?;
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
