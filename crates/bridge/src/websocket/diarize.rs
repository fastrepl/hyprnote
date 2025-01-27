use futures_util::Stream;
use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::{WebSocketClient, WebSocketIO};
use crate::{DiarizeInputChunk, DiarizeOutputChunk};
use hypr_audio::AsyncSource;

#[derive(Default)]
pub struct DiarizeClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
}

impl DiarizeClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn build(self) -> DiarizeClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();
            url.set_path("/diarize");
            url.to_string().parse().unwrap()
        };

        let request = ClientRequestBuilder::new(uri)
            .with_header("Authorization", format!("Bearer {}", self.api_key.unwrap()));

        DiarizeClient { request }
    }
}

pub struct DiarizeClient {
    request: ClientRequestBuilder,
}

impl WebSocketIO for DiarizeClient {
    type Input = DiarizeInputChunk;
    type Output = DiarizeOutputChunk;

    fn create_input(audio_chunk: Vec<u8>) -> Self::Input {
        DiarizeInputChunk { audio: audio_chunk }
    }
}

impl DiarizeClient {
    pub fn builder() -> DiarizeClientBuilder {
        DiarizeClientBuilder::default()
    }

    pub async fn from_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = DiarizeOutputChunk>, crate::Error> {
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(audio_stream).await
    }
}
