// https://github.com/tokio-rs/axum/blob/main/examples/websockets/src/client.rs
// https://github.com/snapview/tokio-tungstenite/blob/master/examples/client.rs

use anyhow::Result;
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};

use crate::Client;

impl Client {
    pub async fn transcribe(&self) -> Result<()> {
        let (ws_stream, _) =
            connect_async(self.transcribe_request.clone().into_client_request()?).await?;

        Ok(())
    }
}
