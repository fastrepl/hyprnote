use anyhow::Result;
use async_trait::async_trait;

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
    ws: WebsocketClient,
}

impl Client {
    pub fn new() -> Self {
        let config = ezsockets::ClientConfig::new("ws://localhost:8080/websocket");
        Self {
            ws: WebsocketClient {},
        }
    }

    pub async fn enhance() -> Result<()> {
        let _ =
            reqwest::get("https://api.github.com/repos/tauri-apps/tauri/releases/latest").await?;
        Ok(())
    }
}
