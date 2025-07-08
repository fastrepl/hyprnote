use futures_util::{Stream, StreamExt};

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

    fn build_uri(&self, audio_mode: hypr_listener_interface::AudioMode) -> String {
        let mut url: url::Url = self.api_base.as_ref().unwrap().parse().unwrap();

        let params = hypr_listener_interface::ListenParams {
            audio_mode,
            ..self.params.clone().unwrap_or_default()
        };

        let language = params.language.code();

        url.set_path("/api/desktop/listen/realtime");
        url.query_pairs_mut()
            .append_pair("language", language)
            .append_pair("static_prompt", &params.static_prompt)
            .append_pair("dynamic_prompt", &params.dynamic_prompt)
            .append_pair("audio_mode", params.audio_mode.as_ref());

        let host = url.host_str().unwrap();

        if host.contains("127.0.0.1") || host.contains("localhost") {
            url.set_scheme("ws").unwrap();
        } else {
            url.set_scheme("wss").unwrap();
        }

        url.to_string()
    }

    pub fn build_single(self) -> ListenClient {
        let uri = self
            .build_uri(hypr_listener_interface::AudioMode::Single)
            .parse()
            .unwrap();

        let request = match self.api_key {
            Some(key) => ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Bearer {}", key)),
            None => ClientRequestBuilder::new(uri),
        };

        ListenClient { request }
    }

    pub fn build_dual(self) -> ListenClientDual {
        let uri = self
            .build_uri(hypr_listener_interface::AudioMode::Dual)
            .parse()
            .unwrap();

        let request = match self.api_key {
            Some(key) => ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Bearer {}", key)),
            None => ClientRequestBuilder::new(uri),
        };

        ListenClientDual { request }
    }
}

#[derive(Clone)]
pub struct ListenClient {
    request: ClientRequestBuilder,
}

impl WebSocketIO for ListenClient {
    type Data = bytes::Bytes;
    type Input = ListenInputChunk;
    type Output = ListenOutputChunk;

    fn to_input(data: Self::Data) -> Self::Input {
        ListenInputChunk::Audio {
            data: data.to_vec(),
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

#[derive(Clone)]
pub struct ListenClientDual {
    request: ClientRequestBuilder,
}

impl WebSocketIO for ListenClientDual {
    type Data = (bytes::Bytes, bytes::Bytes);
    type Input = ListenInputChunk;
    type Output = ListenOutputChunk;

    fn to_input(data: Self::Data) -> Self::Input {
        ListenInputChunk::DualAudio {
            mic: data.0.to_vec(),
            speaker: data.1.to_vec(),
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

    pub async fn from_realtime_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        let input_stream = audio_stream.to_i16_le_chunks(16 * 1000, 1024);
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(input_stream).await
    }
}

impl ListenClientDual {
    pub async fn from_realtime_audio(
        &self,
        mic_stream: impl Stream<Item = bytes::Bytes> + Send + Unpin + 'static,
        speaker_stream: impl Stream<Item = bytes::Bytes> + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = ListenOutputChunk>, hypr_ws::Error> {
        let dual_stream = mic_stream.zip(speaker_stream);
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(dual_stream).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    #[ignore]
    async fn test_listen_client() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let client = ListenClient::builder()
            .api_base("http://127.0.0.1:1234")
            .api_key("".to_string())
            .params(hypr_listener_interface::ListenParams {
                language: hypr_language::ISO639::En.into(),
                ..Default::default()
            })
            .build_single();

        let stream = client.from_realtime_audio(audio).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
