pub mod adapter;
mod batch;
mod error;
mod live;

pub use adapter::{DeepgramAdapter, SttAdapter};
pub use batch::BatchClient;
pub use error::Error;
pub use hypr_ws;
pub use live::{ListenClient, ListenClientDual};

/// Builder for creating STT clients.
///
/// The builder is generic over the adapter type, which determines how to
/// communicate with the STT provider. By default, it uses `DeepgramAdapter`.
///
/// # Example
///
/// ```ignore
/// // Using default Deepgram adapter
/// let client = ListenClient::builder()
///     .api_base("https://api.deepgram.com/v1")
///     .api_key("your-api-key")
///     .params(params)
///     .build_single();
///
/// // Using explicit adapter
/// let client = ListenClientBuilder::with_adapter(DeepgramAdapter::new())
///     .api_base("https://api.deepgram.com/v1")
///     .api_key("your-api-key")
///     .params(params)
///     .build_single();
/// ```
pub struct ListenClientBuilder<A: SttAdapter = DeepgramAdapter> {
    adapter: A,
    api_base: Option<String>,
    api_key: Option<String>,
    params: Option<owhisper_interface::ListenParams>,
}

impl Default for ListenClientBuilder<DeepgramAdapter> {
    fn default() -> Self {
        Self {
            adapter: DeepgramAdapter::default(),
            api_base: None,
            api_key: None,
            params: None,
        }
    }
}

impl ListenClientBuilder<DeepgramAdapter> {
    /// Create a new builder with the default Deepgram adapter.
    pub fn new() -> Self {
        Self::default()
    }
}

impl<A: SttAdapter> ListenClientBuilder<A> {
    /// Create a new builder with a specific adapter.
    pub fn with_adapter(adapter: A) -> Self {
        Self {
            adapter,
            api_base: None,
            api_key: None,
            params: None,
        }
    }

    /// Set the API base URL.
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    /// Set the API key for authentication.
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    /// Set the listen parameters.
    pub fn params(mut self, params: owhisper_interface::ListenParams) -> Self {
        self.params = Some(params);
        self
    }

    /// Get a reference to the adapter.
    pub fn adapter(&self) -> &A {
        &self.adapter
    }

    pub(crate) fn build_url(&self, channels: u8) -> url::Url {
        let api_base = self.api_base.as_ref().expect("api_base is required");
        let params = self.params.clone().unwrap_or_default();
        self.adapter.build_url(api_base, &params, channels)
    }

    pub(crate) fn build_batch_url(&self) -> url::Url {
        let api_base = self.api_base.as_ref().expect("api_base is required");
        let params = self.params.clone().unwrap_or_default();
        self.adapter.build_batch_url(api_base, &params)
    }

    pub(crate) fn build_request(&self, channels: u8) -> hypr_ws::client::ClientRequestBuilder {
        let url = self.build_url(channels);
        self.adapter.build_request(url, self.api_key.as_deref())
    }

    /// Build a client with the specified number of channels.
    pub fn build_with_channels(self, channels: u8) -> ListenClient<A> {
        let request = self.build_request(channels);
        ListenClient {
            adapter: self.adapter,
            request,
        }
    }

    /// Build a batch client for pre-recorded audio transcription.
    pub fn build_batch(self) -> BatchClient {
        let url = self.build_batch_url();

        BatchClient {
            client: reqwest::Client::new(),
            url,
            api_key: self.api_key,
        }
    }

    /// Build a single-channel client.
    pub fn build_single(self) -> ListenClient<A> {
        self.build_with_channels(1)
    }

    /// Build a dual-channel client (mic + speaker).
    pub fn build_dual(self) -> ListenClientDual<A> {
        let request = self.build_request(2);
        ListenClientDual {
            adapter: self.adapter,
            request,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;
    use live::ListenClientInput;

    #[tokio::test]
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
                    owhisper_interface::stream::StreamResponse::TranscriptResponse {
                        channel,
                        ..
                    } => {
                        println!("{:?}", channel.alternatives.first().unwrap().transcript);
                    }
                    _ => {}
                },
                _ => {}
            }
        }
    }

    #[tokio::test]
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
    async fn test_client_ag() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 16000);

        let input = Box::pin(tokio_stream::StreamExt::throttle(
            audio.map(|chunk| ListenClientInput::Audio(bytes::Bytes::from(chunk.to_vec()))),
            std::time::Duration::from_millis(20),
        ));

        let client = ListenClient::builder()
            .api_base("ws://localhost:50060/v1")
            .api_key("".to_string())
            .params(owhisper_interface::ListenParams {
                model: Some("large-v3-v20240930_626MB".to_string()),
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
}
