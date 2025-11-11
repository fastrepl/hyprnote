mod batch;
mod error;
mod live;

use url::form_urlencoded::Serializer;
use url::UrlQuery;

pub use batch::BatchClient;
pub use error::Error;
pub use hypr_ws;
pub use live::{ListenClient, ListenClientDual};

const RESAMPLED_SAMPLE_RATE_HZ: u32 = 16_000;

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

    fn listen_endpoint_url(&self) -> url::Url {
        let mut url: url::Url = self
            .api_base
            .as_ref()
            .expect("api_base is required")
            .parse()
            .expect("invalid api_base");

        let mut path = url.path().to_string();
        if !path.ends_with('/') {
            path.push('/');
        }
        path.push_str("listen");
        url.set_path(&path);

        url
    }

    pub(crate) fn build_batch_url(&self) -> url::Url {
        let params = self.params.clone().unwrap_or_default();
        let mut url = self.listen_endpoint_url();

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, &params);

            let model = params.model.as_deref().unwrap_or("hypr-whisper");
            let sample_rate = params.sample_rate.to_string();

            query_pairs.append_pair("model", model);
            query_pairs.append_pair("encoding", "linear16");
            query_pairs.append_pair("sample_rate", &sample_rate);
            query_pairs.append_pair("diarize", "true");
            query_pairs.append_pair("multichannel", "false");
            query_pairs.append_pair("punctuate", "true");
            query_pairs.append_pair("smart_format", "true");
            query_pairs.append_pair("utterances", "true");
            query_pairs.append_pair("numerals", "true");
            query_pairs.append_pair("filler_words", "false");
            query_pairs.append_pair("dictation", "false");
            query_pairs.append_pair("paragraphs", "false");
            query_pairs.append_pair("profanity_filter", "false");
            query_pairs.append_pair("measurements", "false");
            query_pairs.append_pair("topics", "false");
            query_pairs.append_pair("sentiment", "false");
            query_pairs.append_pair("intents", "false");
            query_pairs.append_pair("detect_entities", "false");
            query_pairs.append_pair("mip_opt_out", "true");

            append_keyword_query(&mut query_pairs, &params);
        }

        url
    }

    pub(crate) fn build_url(&self, channels: u8) -> url::Url {
        let mut params = self.params.clone().unwrap_or_default();
        params.channels = channels;

        let mut url = self.listen_endpoint_url();

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, &params);

            let model = params.model.as_deref().unwrap_or("hypr-whisper");
            let channel_string = channels.to_string();
            let sample_rate = params.sample_rate.to_string();

            query_pairs.append_pair("model", model);
            query_pairs.append_pair("channels", &channel_string);
            query_pairs.append_pair("filler_words", "false");
            query_pairs.append_pair("interim_results", "true");
            query_pairs.append_pair("mip_opt_out", "true");
            query_pairs.append_pair("sample_rate", &sample_rate);
            query_pairs.append_pair("encoding", "linear16");
            query_pairs.append_pair("diarize", "true");
            query_pairs.append_pair("multichannel", "true");
            query_pairs.append_pair("punctuate", "true");
            query_pairs.append_pair("smart_format", "true");
            query_pairs.append_pair("vad_events", "false");
            query_pairs.append_pair("numerals", "true");

            let redemption_time = params.redemption_time_ms.unwrap_or(400).to_string();
            query_pairs.append_pair("redemption_time_ms", &redemption_time);

            append_keyword_query(&mut query_pairs, &params);
        }

        url
    }

    pub(crate) fn build_uri(&self, channels: u8) -> String {
        let mut url = self.build_url(channels);

        if let Some(host) = url.host_str() {
            if host.contains("127.0.0.1") || host.contains("localhost") || host.contains("0.0.0.0")
            {
                let _ = url.set_scheme("ws");
            } else {
                let _ = url.set_scheme("wss");
            }
        }

        url.to_string()
    }

    pub(crate) fn build_request(&self, channels: u8) -> hypr_ws::client::ClientRequestBuilder {
        let uri = self.build_uri(channels).parse().unwrap();

        let request = match &self.api_key {
            Some(key) => hypr_ws::client::ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Token {}", key)),
            None => hypr_ws::client::ClientRequestBuilder::new(uri),
        };

        request
    }

    pub fn build_with_channels(self, channels: u8) -> ListenClient {
        let request = self.build_request(channels);
        ListenClient { request }
    }

    pub fn build_batch(self) -> BatchClient {
        let url = self.build_batch_url();

        BatchClient {
            client: reqwest::Client::new(),
            url,
            api_key: self.api_key,
        }
    }

    pub fn build_single(self) -> ListenClient {
        self.build_with_channels(1)
    }

    pub fn build_dual(self) -> ListenClientDual {
        let request = self.build_request(2);
        ListenClientDual { request }
    }
}

pub(crate) fn append_language_query<'a>(
    query_pairs: &mut Serializer<'a, UrlQuery>,
    params: &owhisper_interface::ListenParams,
) {
    match params.languages.len() {
        0 => {
            query_pairs.append_pair("detect_language", "true");
        }
        1 => {
            if let Some(language) = params.languages.first() {
                let code = language.iso639().code();
                query_pairs.append_pair("language", code);
                query_pairs.append_pair("languages", code);
            }
        }
        _ => {
            query_pairs.append_pair("language", "multi");
            for language in &params.languages {
                let code = language.iso639().code();
                query_pairs.append_pair("languages", code);
            }
        }
    }
}

pub(crate) fn append_keyword_query<'a>(
    query_pairs: &mut Serializer<'a, UrlQuery>,
    params: &owhisper_interface::ListenParams,
) {
    if params.keywords.is_empty() {
        return;
    }

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
