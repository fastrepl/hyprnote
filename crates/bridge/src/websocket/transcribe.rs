use futures_util::Stream;
use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::{WebSocketClient, WebSocketIO};
use crate::{TranscribeInputChunk, TranscribeOutputChunk};
use hypr_audio::AsyncSource;

#[derive(Default)]
pub struct TranscribeClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    language: Option<codes_iso_639::part_1::LanguageCode>,
}

impl TranscribeClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn language(mut self, language: codes_iso_639::part_1::LanguageCode) -> Self {
        self.language = Some(language);
        self
    }

    pub fn build(self) -> TranscribeClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();

            let language = self.language.unwrap().code();
            let language =
                language.chars().next().unwrap().to_uppercase().to_string() + &language[1..];

            url.set_path("/api/native/transcribe/realtime");
            url.query_pairs_mut().append_pair("language", &language);

            if cfg!(debug_assertions) {
                if url.port().is_none() {
                    url.set_port(Some(3000)).unwrap();
                }

                url.set_scheme("ws").unwrap();
                url.set_host(Some("localhost")).unwrap();
            } else {
                url.set_scheme("wss").unwrap();
                url.set_host(Some("app.hyprnote.com")).unwrap();
            }

            url.to_string().parse().unwrap()
        };

        let request = ClientRequestBuilder::new(uri).with_header(
            reqwest::header::AUTHORIZATION.to_string(),
            format!("Bearer {}", self.api_key.unwrap()),
        );

        TranscribeClient { request }
    }
}

pub struct TranscribeClient {
    request: ClientRequestBuilder,
}

impl WebSocketIO for TranscribeClient {
    type Input = TranscribeInputChunk;
    type Output = TranscribeOutputChunk;

    fn create_input(audio_chunk: Vec<u8>) -> Self::Input {
        TranscribeInputChunk { audio: audio_chunk }
    }
}

impl TranscribeClient {
    pub fn builder() -> TranscribeClientBuilder {
        TranscribeClientBuilder::default()
    }

    pub async fn from_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = TranscribeOutputChunk>, crate::Error> {
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(audio_stream).await
    }
}
