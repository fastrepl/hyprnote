use futures_util::Stream;

use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};
use owhisper_interface::{ControlMessage, MixedMessage, StreamResponse};

fn interleave_audio(mic: &[u8], speaker: &[u8]) -> Vec<u8> {
    let mic_samples: Vec<i16> = mic
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();
    let speaker_samples: Vec<i16> = speaker
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();

    let max_len = mic_samples.len().max(speaker_samples.len());
    let mut interleaved = Vec::with_capacity(max_len * 2 * 2);

    for i in 0..max_len {
        let mic_sample = mic_samples.get(i).copied().unwrap_or(0);
        let speaker_sample = speaker_samples.get(i).copied().unwrap_or(0);
        interleaved.extend_from_slice(&mic_sample.to_le_bytes());
        interleaved.extend_from_slice(&speaker_sample.to_le_bytes());
    }

    interleaved
}

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

    fn build_uri(&self, channels: u8) -> String {
        let mut url: url::Url = self.api_base.as_ref().unwrap().parse().unwrap();

        let params = owhisper_interface::ListenParams {
            channels,
            ..self.params.clone().unwrap_or_default()
        };

        {
            let mut path = url.path().to_string();
            if !path.ends_with('/') {
                path.push('/');
            }
            path.push_str("v1/listen");
            url.set_path(&path);
        }

        {
            let mut query_pairs = url.query_pairs_mut();

            // https://developers.deepgram.com/docs/language-detection#restricting-the-detectable-languages
            // https://www.rfc-editor.org/info/bcp47
            match params.languages.len() {
                0 => {
                    query_pairs.append_pair("detect_language", "true");
                }
                1 => {
                    let code = params.languages[0].iso639().code();
                    query_pairs.append_pair("language", code);
                    query_pairs.append_pair("languages", code);
                }
                _ => {
                    query_pairs.append_pair("language", params.languages[0].iso639().code());

                    for lang in &params.languages {
                        let code = lang.iso639().code();

                        query_pairs.append_pair("languages", code);
                        query_pairs.append_pair("detect_language", code);
                    }
                }
            }

            query_pairs
                // https://developers.deepgram.com/reference/speech-to-text-api/listen-streaming#request.query
                .append_pair("model", &params.model.unwrap_or("hypr-whisper".to_string()))
                .append_pair("interim_results", "true")
                .append_pair("mip_opt_out", "true")
                .append_pair("sample_rate", "16000")
                .append_pair("encoding", "linear16")
                .append_pair("diarize", "true")
                .append_pair("multichannel", "true")
                .append_pair("punctuate", "true")
                .append_pair("smart_format", "true")
                .append_pair("vad_events", "false")
                .append_pair("channels", &channels.to_string());

            query_pairs.append_pair(
                "redemption_time_ms",
                &params.redemption_time_ms.unwrap_or(400).to_string(),
            );
        }

        let host = url.host_str().unwrap();

        if host.contains("127.0.0.1") || host.contains("localhost") {
            url.set_scheme("ws").unwrap();
        } else {
            url.set_scheme("wss").unwrap();
        }

        url.to_string()
    }

    fn build_request(self, channels: u8) -> ClientRequestBuilder {
        let uri = self.build_uri(channels).parse().unwrap();

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
        let request = self.build_request(1);
        ListenClient { request }
    }

    pub fn build_dual(self) -> ListenClientDual {
        let request = self.build_request(2);
        ListenClientDual { request }
    }
}

#[derive(Clone)]
pub struct ListenClient {
    request: ClientRequestBuilder,
}

type ListenClientInput = MixedMessage<bytes::Bytes, ControlMessage>;
type ListenClientDualInput = MixedMessage<(bytes::Bytes, bytes::Bytes), ControlMessage>;

impl WebSocketIO for ListenClient {
    type Data = ListenClientInput;
    type Input = ListenClientInput;
    type Output = StreamResponse;

    fn to_input(data: Self::Data) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        match input {
            MixedMessage::Audio(data) => Message::Binary(data),
            MixedMessage::Control(control) => {
                Message::Text(serde_json::to_string(&control).unwrap().into())
            }
        }
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
    type Data = ListenClientDualInput;
    type Input = ListenClientInput;
    type Output = StreamResponse;

    fn to_input(data: Self::Data) -> Self::Input {
        match data {
            ListenClientDualInput::Audio((mic, speaker)) => {
                let interleaved = interleave_audio(&mic, &speaker);
                ListenClientInput::Audio(interleaved.into())
            }
            ListenClientDualInput::Control(control) => ListenClientInput::Control(control),
        }
    }

    fn to_message(input: Self::Input) -> Message {
        match input {
            ListenClientInput::Audio(data) => Message::Binary(data),
            ListenClientInput::Control(control) => {
                Message::Text(serde_json::to_string(&control).unwrap().into())
            }
        }
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
        audio_stream: impl Stream<Item = ListenClientInput> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = StreamResponse>,
            hypr_ws::client::WebSocketHandle,
        ),
        hypr_ws::Error,
    > {
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(audio_stream).await
    }
}

impl ListenClientDual {
    pub async fn from_realtime_audio(
        &self,
        stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = StreamResponse>,
            hypr_ws::client::WebSocketHandle,
        ),
        hypr_ws::Error,
    > {
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(stream).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;

    #[tokio::test]
    // cargo test -p owhisper-client test_client_deepgram -- --nocapture
    async fn test_client_deepgram() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);
        let input = audio.map(|chunk| ListenClientInput::Audio(chunk));

        let client = ListenClient::builder()
            .api_base("https://api.deepgram.com")
            .api_key(std::env::var("DEEPGRAM_API_KEY").unwrap())
            .params(owhisper_interface::ListenParams {
                model: Some("nova-2".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single();

        let (stream, _) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }

    #[tokio::test]
    // cargo test -p owhisper-client test_owhisper_with_owhisper -- --nocapture
    async fn test_owhisper_with_owhisper() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);
        let input = audio.map(|chunk| ListenClientInput::Audio(chunk));

        let client = ListenClient::builder()
            .api_base("ws://127.0.0.1:52693")
            .api_key("".to_string())
            .params(owhisper_interface::ListenParams {
                model: Some("whisper-cpp-small-q8".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single();

        let (stream, _) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }

    #[tokio::test]
    // cargo test -p owhisper-client test_owhisper_with_deepgram -- --nocapture
    async fn test_owhisper_with_deepgram() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512)
        .map(Ok::<_, std::io::Error>);

        let mut stream =
            deepgram::Deepgram::with_base_url_and_api_key("ws://127.0.0.1:52978", "TODO")
                .unwrap()
                .transcription()
                .stream_request_with_options(
                    deepgram::common::options::Options::builder()
                        .language(deepgram::common::options::Language::en)
                        .model(deepgram::common::options::Model::CustomId(
                            "whisper-cpp-small-q8".to_string(),
                        ))
                        .build(),
                )
                .channels(1)
                .encoding(deepgram::common::options::Encoding::Linear16)
                .sample_rate(16000)
                .stream(audio)
                .await
                .unwrap();

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }

    #[tokio::test]
    // cargo test -p owhisper-client test_client_ag -- --nocapture
    async fn test_client_ag() {
        let audio_1 = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);

        let audio_2 = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);

        let input = audio_1
            .zip(audio_2)
            .map(|(mic, speaker)| ListenClientDualInput::Audio((mic, speaker)));

        let client = ListenClient::builder()
            .api_base("ws://localhost:50060")
            .api_key("".to_string())
            .params(owhisper_interface::ListenParams {
                model: Some("tiny.en".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual();

        let (stream, _) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
