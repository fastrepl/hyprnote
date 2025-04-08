use futures_util::Stream;

use hypr_audio::AsyncSource;
use hypr_audio_utils::AudioFormatExt;
use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};

use crate::{ListenInputChunk, ListenOutputChunk};

#[derive(Default)]
pub struct ListenClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<hypr_listener_interface::ListenParams>,
}

impl ListenClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn params(mut self, params: hypr_listener_interface::ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    pub fn build(self) -> ListenClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();

            let params = self.params.unwrap_or_default();
            let language = params.language.code();
            let language =
                language.chars().next().unwrap().to_uppercase().to_string() + &language[1..];

            url.set_path("/api/native/listen/realtime");
            url.query_pairs_mut()
                .append_pair("language", &language)
                .append_pair("static_prompt", &params.static_prompt)
                .append_pair("dynamic_prompt", &params.dynamic_prompt);

            if url.host_str().unwrap().contains("127.0.0.1") {
                url.set_scheme("ws").unwrap();
            } else {
                url.set_scheme("wss").unwrap();
            }

            url.to_string().parse().unwrap()
        };

        let request = match self.api_key {
            Some(key) => ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Bearer {}", key)),
            None => ClientRequestBuilder::new(uri),
        };

        ListenClient { request }
    }
}

#[derive(Clone)]
pub struct ListenClient {
    request: ClientRequestBuilder,
}

impl WebSocketIO for ListenClient {
    type Input = ListenInputChunk;
    type Output = ListenOutputChunk;

    fn to_input(data: bytes::Bytes) -> Self::Input {
        ListenInputChunk {
            audio: data.to_vec(),
        }
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Text(serde_json::to_string(&input).unwrap().into())
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}

impl ListenClient {
    pub fn builder() -> ListenClientBuilder {
        ListenClientBuilder::default()
    }

    pub async fn from_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        let input_stream = audio_stream.to_i16_le_chunks(16 * 1000, 1024);
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(input_stream).await
    }
}
