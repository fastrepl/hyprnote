use futures_util::Stream;
use reqwest::StatusCode;
use std::path::Path;

use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};
use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};
use thiserror::Error;
use tokio::fs;

pub use hypr_ws;

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

    fn build_url(&self, channels: u8) -> url::Url {
        let mut url: url::Url = self
            .api_base
            .as_ref()
            .expect("api_base is required")
            .parse()
            .expect("invalid api_base");

        let params = owhisper_interface::ListenParams {
            channels,
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
                    // https://developers.deepgram.com/docs/multilingual-code-switching
                    query_pairs.append_pair("language", "multi");

                    for lang in &params.languages {
                        let code = lang.iso639().code();

                        query_pairs.append_pair("languages", code);

                        // Not supported for streaming
                        // https://developers.deepgram.com/docs/language-detection
                        // query_pairs.append_pair("detect_language", code);
                    }
                }
            }

            query_pairs
                // https://developers.deepgram.com/reference/speech-to-text-api/listen-streaming#request.query
                .append_pair("model", params.model.as_deref().unwrap_or("hypr-whisper"))
                .append_pair("channels", &channels.to_string())
                .append_pair("filler_words", "false")
                .append_pair("interim_results", "true")
                .append_pair("mip_opt_out", "true")
                .append_pair("sample_rate", "16000")
                .append_pair("encoding", "linear16")
                .append_pair("diarize", "true")
                .append_pair("multichannel", "true")
                .append_pair("punctuate", "true")
                .append_pair("smart_format", "true")
                .append_pair("vad_events", "false")
                .append_pair("numerals", "true");

            query_pairs.append_pair(
                "redemption_time_ms",
                &params.redemption_time_ms.unwrap_or(400).to_string(),
            );

            let use_keyterms = params
                .model
                .as_ref()
                .map(|model| model.contains("nova-3"))
                .unwrap_or(false);

            let param_name = if use_keyterms { "keyterm" } else { "keywords" };

            for keyword in &params.keywords {
                query_pairs.append_pair(param_name, keyword);
            }
        }

        url
    }

    fn build_uri(&self, channels: u8) -> String {
        let mut url = self.build_url(channels);

        if let Some(host) = url.host_str() {
            if host.contains("127.0.0.1") || host.contains("localhost") {
                let _ = url.set_scheme("ws");
            } else {
                let _ = url.set_scheme("wss");
            }
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

    pub fn build_batch(self) -> BatchClient {
        let channels = self
            .params
            .as_ref()
            .map(|params| params.channels)
            .unwrap_or(1);

        let url = self.build_url(channels);

        BatchClient {
            client: reqwest::Client::new(),
            url,
            api_key: self.api_key,
        }
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

#[derive(Clone)]
pub struct BatchClient {
    client: reqwest::Client,
    url: url::Url,
    api_key: Option<String>,
}

#[derive(Debug, Error)]
pub enum BatchError {
    #[error("failed to read audio file: {0}")]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Http(#[from] reqwest::Error),
    #[error("unexpected response status {status}: {body}")]
    UnexpectedStatus { status: StatusCode, body: String },
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
            impl Stream<Item = Result<StreamResponse, hypr_ws::Error>>,
            hypr_ws::client::WebSocketHandle,
        ),
        hypr_ws::Error,
    > {
        let ws = WebSocketClient::new(self.request.clone());
        ws.from_audio::<Self>(audio_stream).await
    }
}

impl BatchClient {
    pub fn builder() -> ListenClientBuilder {
        ListenClientBuilder::default()
    }

    pub async fn transcribe_file<P: AsRef<Path>>(
        &self,
        file_path: P,
    ) -> Result<BatchResponse, BatchError> {
        let path = file_path.as_ref();
        let data = fs::read(path).await?;

        let mut request = self.client.post(self.url.clone());

        if let Some(key) = &self.api_key {
            request = request.header("Authorization", format!("Token {}", key));
        }

        let response = request
            .header("Accept", "application/json")
            .header("Content-Type", "application/octet-stream")
            .body(data)
            .send()
            .await?;

        let status = response.status();
        if status.is_success() {
            Ok(response.json().await?)
        } else {
            Err(BatchError::UnexpectedStatus {
                status,
                body: response.text().await.unwrap_or_default(),
            })
        }
    }
}

impl ListenClientDual {
    pub async fn from_realtime_audio(
        &self,
        stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = Result<StreamResponse, hypr_ws::Error>>,
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
        let _ = tracing_subscriber::fmt::try_init();

        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);

        let input = Box::pin(tokio_stream::StreamExt::throttle(
            audio.map(|chunk| ListenClientInput::Audio(chunk)),
            std::time::Duration::from_millis(20),
        ));

        let client = ListenClient::builder()
            .api_base("https://api.deepgram.com/v1")
            .api_key(std::env::var("DEEPGRAM_API_KEY").unwrap())
            .params(owhisper_interface::ListenParams {
                model: Some("nova-3".to_string()),
                languages: vec![
                    hypr_language::ISO639::En.into(),
                    hypr_language::ISO639::Es.into(),
                ],
                ..Default::default()
            })
            .build_single();

        let (stream, _) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            match result {
                Ok(response) => match response {
                    StreamResponse::TranscriptResponse { channel, .. } => {
                        println!("{:?}", channel.alternatives.first().unwrap().transcript);
                    }
                    _ => {}
                },
                _ => {}
            }
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
            .api_base("ws://127.0.0.1:52693/v1")
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
            .api_base("ws://localhost:50060/v1")
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
