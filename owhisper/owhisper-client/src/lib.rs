use futures_util::{Stream, StreamExt};

use hypr_audio::AsyncSource;
use hypr_audio_utils::AudioFormatExt;
use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};

use owhisper_interface::StreamResponse;

#[derive(Default)]
pub struct ListenClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<owhisper_interface::ListenParams>,
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

    pub fn params(mut self, params: owhisper_interface::ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    fn build_uri(&self, audio_mode: owhisper_interface::AudioMode) -> String {
        let mut url: url::Url = self.api_base.as_ref().unwrap().parse().unwrap();

        let params = owhisper_interface::ListenParams {
            audio_mode,
            ..self.params.clone().unwrap_or_default()
        };

        {
            let mut path = url.path().to_string();
            if !path.ends_with('/') {
                path.push('/');
            }
            path.push_str("listen");
            url.set_path(&path);
        }
        {
            let mut query_pairs = url.query_pairs_mut();

            for lang in &params.languages {
                query_pairs.append_pair("languages", lang.iso639().code());
            }
            query_pairs
                // https://developers.deepgram.com/reference/speech-to-text-api/listen-streaming#handshake
                .append_pair("model", &params.model.unwrap_or("hypr-whisper".to_string()))
                .append_pair("sample_rate", "16000")
                .append_pair("encoding", "linear16")
                .append_pair("audio_mode", params.audio_mode.as_ref())
                .append_pair("static_prompt", &params.static_prompt)
                .append_pair("dynamic_prompt", &params.dynamic_prompt)
                .append_pair("redemption_time_ms", &params.redemption_time_ms.to_string());
        }

        let host = url.host_str().unwrap();

        if host.contains("127.0.0.1") || host.contains("localhost") {
            url.set_scheme("ws").unwrap();
        } else {
            url.set_scheme("wss").unwrap();
        }

        url.to_string()
    }

    fn build_request(self) -> ClientRequestBuilder {
        let uri = self
            .build_uri(owhisper_interface::AudioMode::Single)
            .parse()
            .unwrap();

        let request = match self.api_key {
            // https://github.com/deepgram/deepgram-rust-sdk/blob/d2f2723/src/lib.rs#L114-L115
            // https://github.com/deepgram/deepgram-rust-sdk/blob/d2f2723/src/lib.rs#L323-L324
            Some(key) => ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Token {}", key)),
            None => ClientRequestBuilder::new(uri),
        };

        request
    }

    pub fn build_single(self) -> ListenClient {
        let request = self.build_request();
        ListenClient { request }
    }

    pub fn build_dual(self) -> ListenClientDual {
        let request = self.build_request();
        ListenClientDual { request }
    }
}

#[derive(Clone, Debug)]
pub struct ListenClient {
    request: ClientRequestBuilder,
}

impl WebSocketIO for ListenClient {
    type Data = bytes::Bytes;
    type Input = bytes::Bytes;
    type Output = StreamResponse;

    fn to_input(data: Self::Data) -> Self::Input {
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

#[derive(Clone)]
pub struct ListenClientDual {
    request: ClientRequestBuilder,
}

impl WebSocketIO for ListenClientDual {
    type Data = bytes::Bytes;
    type Input = bytes::Bytes;
    type Output = StreamResponse;

    fn to_input(data: Self::Data) -> Self::Input {
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

impl ListenClient {
    pub fn builder() -> ListenClientBuilder {
        ListenClientBuilder::default()
    }

    pub async fn from_realtime_audio(
        &self,
        audio_stream: impl AsyncSource + Send + Unpin + 'static,
    ) -> Result<impl Stream<Item = StreamResponse>, hypr_ws::Error> {
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
    ) -> Result<impl Stream<Item = StreamResponse>, hypr_ws::Error> {
        let dual_stream = mic_stream
            .zip(speaker_stream)
            .map(|(mic_chunk, speaker_chunk)| {
                let mut interleaved = Vec::new();

                let mic_samples = mic_chunk.chunks_exact(2);
                let speaker_samples = speaker_chunk.chunks_exact(2);

                for (mic_sample, speaker_sample) in mic_samples.zip(speaker_samples) {
                    interleaved.extend_from_slice(mic_sample);
                    interleaved.extend_from_slice(speaker_sample);
                }

                bytes::Bytes::from(interleaved)
            });

        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(dual_stream).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use futures_util::StreamExt;
    use owhisper_interface::ListenParams;

    #[tokio::test]
    // cargo test -p owhisper-client test_deepgram_compat -- --nocapture
    async fn test_deepgram_compat() {
        let client = ListenClient::builder()
            .api_base("https://api.deepgram.com/v1")
            .api_key(std::env::var("DEEPGRAM_API_KEY").unwrap())
            .params(ListenParams {
                model: Some("nova-3".to_string()),
                ..Default::default()
            })
            .build_single();

        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let stream = client.from_realtime_audio(audio).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
