use bytes::BufMut;
use futures_util::{Stream, StreamExt};
use kalosm_sound::AsyncSource;

use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};

#[derive(Default)]
pub struct WhisperClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    language: Option<codes_iso_639::part_1::LanguageCode>,
}

#[derive(Clone)]
pub struct WhisperClient {
    request: ClientRequestBuilder,
}

impl WhisperClientBuilder {
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

    pub fn build(self) -> WhisperClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();
            url.set_scheme("wss").unwrap();
            url.set_path("/v1/audio/transcriptions/streaming");

            {
                let mut pairs = url.query_pairs_mut();

                pairs.append_pair("response_format", "verbose_json");
                pairs.append_pair("temperature", "0");

                if let Some(language) = self.language {
                    pairs.append_pair("language", &language.code());
                }
            }

            url.to_string().parse().unwrap()
        };

        let request =
            ClientRequestBuilder::new(uri).with_header("Authorization", self.api_key.unwrap());

        WhisperClient { request }
    }
}

impl WhisperClient {
    pub fn builder() -> WhisperClientBuilder {
        WhisperClientBuilder::default()
    }

    pub async fn from_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = WhisperOutput>, hypr_ws::Error> {
        let processed_stream = audio_stream.resample(16 * 1000).chunks(1024).map(|chunk| {
            let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
            for sample in chunk {
                let scaled = (sample * 32767.0).clamp(-32768.0, 32767.0);
                buf.put_i16_le(scaled as i16);
            }
            buf.freeze()
        });

        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(processed_stream).await
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct WhisperOutput {
    pub language: String,
    pub text: String,
    pub segments: Vec<WhisperOutputSegment>,
}

#[derive(Debug, serde::Deserialize)]
pub struct WhisperOutputSegment {
    pub id: String,
    pub text: String,
}

impl WebSocketIO for WhisperClient {
    type Input = bytes::Bytes;
    type Output = WhisperOutput;

    fn to_input(data: bytes::Bytes) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Binary(input)
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}
