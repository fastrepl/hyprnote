use std::time::Duration;

use hypr_ws::client::{ClientRequestBuilder, Message};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, ListenParams};
use url::form_urlencoded::Serializer;
use url::UrlQuery;

use super::SttAdapter;

/// Deepgram STT adapter.
///
/// This adapter implements the Deepgram-like API format, which is also used by
/// owhisper-server and other compatible services.
#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    pub fn new() -> Self {
        Self
    }

    fn listen_endpoint_url(&self, api_base: &str) -> url::Url {
        let mut url: url::Url = api_base.parse().expect("invalid api_base");

        let mut path = url.path().to_string();
        if !path.ends_with('/') {
            path.push('/');
        }
        path.push_str("listen");
        url.set_path(&path);

        url
    }

    fn apply_ws_scheme(&self, url: &mut url::Url) {
        if let Some(host) = url.host_str() {
            if host.contains("127.0.0.1") || host.contains("localhost") || host.contains("0.0.0.0")
            {
                let _ = url.set_scheme("ws");
            } else {
                let _ = url.set_scheme("wss");
            }
        }
    }
}

impl SttAdapter for DeepgramAdapter {
    fn build_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url {
        let mut url = self.listen_endpoint_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, params);

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

            append_keyword_query(&mut query_pairs, params);
        }

        self.apply_ws_scheme(&mut url);
        url
    }

    fn build_batch_url(&self, api_base: &str, params: &ListenParams) -> url::Url {
        let mut url = self.listen_endpoint_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, params);

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

            append_keyword_query(&mut query_pairs, params);
        }

        url
    }

    fn build_request(&self, url: url::Url, api_key: Option<&str>) -> ClientRequestBuilder {
        let uri = url.to_string().parse().unwrap();

        match api_key {
            Some(key) => ClientRequestBuilder::new(uri)
                .with_header("Authorization", format!("Token {}", key)),
            None => ClientRequestBuilder::new(uri),
        }
    }

    fn encode_audio(&self, audio: bytes::Bytes) -> Message {
        Message::Binary(audio)
    }

    fn encode_control(&self, control: &ControlMessage) -> Message {
        Message::Text(serde_json::to_string(control).unwrap().into())
    }

    fn decode_response(&self, msg: Message) -> Option<StreamResponse> {
        match msg {
            Message::Text(text) => serde_json::from_str::<StreamResponse>(&text).ok(),
            _ => None,
        }
    }

    fn keep_alive_config(&self) -> Option<(Duration, Message)> {
        let message = Message::Text(
            serde_json::to_string(&ControlMessage::KeepAlive)
                .unwrap()
                .into(),
        );
        Some((Duration::from_secs(5), message))
    }
}

fn append_language_query<'a>(query_pairs: &mut Serializer<'a, UrlQuery>, params: &ListenParams) {
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

fn append_keyword_query<'a>(query_pairs: &mut Serializer<'a, UrlQuery>, params: &ListenParams) {
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
