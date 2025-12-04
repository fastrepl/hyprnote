use hypr_ws::client::Message;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::GladiaAdapter;
use crate::adapter::parsing::WordBuilder;
use crate::adapter::RealtimeSttAdapter;

impl RealtimeSttAdapter for GladiaAdapter {
    fn provider_name(&self) -> &'static str {
        "gladia"
    }

    fn supports_native_multichannel(&self) -> bool {
        true
    }

    fn build_ws_url(&self, api_base: &str, _params: &ListenParams, _channels: u8) -> url::Url {
        let (mut url, existing_params) = Self::build_ws_url_from_base(api_base);

        if !existing_params.is_empty() {
            let mut query_pairs = url.query_pairs_mut();
            for (key, value) in &existing_params {
                query_pairs.append_pair(key, value);
            }
        }

        url
    }

    fn build_ws_url_with_api_key(
        &self,
        api_base: &str,
        params: &ListenParams,
        channels: u8,
        api_key: Option<&str>,
    ) -> Option<url::Url> {
        if let Some(proxy_result) = crate::adapter::build_proxy_ws_url(api_base) {
            let (mut url, existing_params) = proxy_result;
            if !existing_params.is_empty() {
                let mut query_pairs = url.query_pairs_mut();
                for (key, value) in &existing_params {
                    query_pairs.append_pair(key, value);
                }
            }
            return Some(url);
        }

        let key = api_key?;

        let post_url = if api_base.is_empty() {
            "https://api.gladia.io/v2/live".to_string()
        } else {
            let parsed: url::Url = api_base.parse().ok()?;
            let host = parsed.host_str().unwrap_or("api.gladia.io");
            let scheme = if crate::adapter::is_local_host(host) {
                "http"
            } else {
                "https"
            };
            let host_with_port = match parsed.port() {
                Some(port) => format!("{host}:{port}"),
                None => host.to_string(),
            };
            format!("{scheme}://{host_with_port}/v2/live")
        };

        let language_config = if params.languages.is_empty() {
            None
        } else {
            Some(LanguageConfig {
                languages: params
                    .languages
                    .iter()
                    .map(|l| l.iso639().code().to_string())
                    .collect(),
            })
        };

        let custom_vocabulary = if params.keywords.is_empty() {
            None
        } else {
            Some(params.keywords.clone())
        };

        let body = GladiaConfig {
            encoding: "wav/pcm",
            sample_rate: params.sample_rate,
            bit_depth: 16,
            channels,
            language_config,
            custom_vocabulary,
            messages_config: Some(MessagesConfig {
                receive_partial_transcripts: true,
            }),
        };

        let body_json = match serde_json::to_value(&body) {
            Ok(v) => v,
            Err(e) => {
                tracing::error!(error = ?e, "gladia_init_serialize_failed");
                return None;
            }
        };

        let resp = match ureq::post(&post_url)
            .set("x-gladia-key", key)
            .set("Content-Type", "application/json")
            .send_json(body_json)
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!(error = ?e, "gladia_init_request_failed");
                return None;
            }
        };

        let init: InitResponse = match resp.into_json() {
            Ok(r) => r,
            Err(e) => {
                tracing::error!(error = ?e, "gladia_init_parse_failed");
                return None;
            }
        };

        tracing::debug!(session_id = %init.id, url = %init.url, "gladia_session_initialized");
        url::Url::parse(&init.url).ok()
    }

    fn build_auth_header(&self, _api_key: Option<&str>) -> Option<(&'static str, String)> {
        None
    }

    fn keep_alive_message(&self) -> Option<Message> {
        None
    }

    fn initial_message(
        &self,
        _api_key: Option<&str>,
        _params: &ListenParams,
        _channels: u8,
    ) -> Option<Message> {
        None
    }

    fn finalize_message(&self) -> Message {
        Message::Text(r#"{"type":"stop_recording"}"#.into())
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        let msg: GladiaMessage = match serde_json::from_str(raw) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = ?e, raw = raw, "gladia_json_parse_failed");
                return vec![];
            }
        };

        match msg {
            GladiaMessage::Transcript(transcript) => Self::parse_transcript(transcript),
            GladiaMessage::StartSession { id } => {
                tracing::debug!(session_id = %id, "gladia_session_started");
                vec![]
            }
            GladiaMessage::EndSession { id } => {
                tracing::debug!(session_id = %id, "gladia_session_ended");
                vec![StreamResponse::TerminalResponse {
                    request_id: id,
                    created: String::new(),
                    duration: 0.0,
                    channels: 1,
                }]
            }
            GladiaMessage::SpeechStart { .. } => vec![],
            GladiaMessage::SpeechEnd { .. } => vec![],
            GladiaMessage::StartRecording { .. } => vec![],
            GladiaMessage::EndRecording { .. } => vec![],
            GladiaMessage::Error { message, code } => {
                tracing::error!(error = %message, code = ?code, "gladia_error");
                vec![]
            }
            GladiaMessage::Unknown => {
                tracing::debug!(raw = raw, "gladia_unknown_message");
                vec![]
            }
        }
    }
}

#[derive(Serialize)]
struct GladiaConfig<'a> {
    encoding: &'a str,
    sample_rate: u32,
    bit_depth: u8,
    channels: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    language_config: Option<LanguageConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    custom_vocabulary: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    messages_config: Option<MessagesConfig>,
}

#[derive(Serialize)]
struct LanguageConfig {
    languages: Vec<String>,
}

#[derive(Serialize)]
struct MessagesConfig {
    receive_partial_transcripts: bool,
}

#[derive(Debug, Deserialize)]
struct InitResponse {
    id: String,
    url: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum GladiaMessage {
    #[serde(rename = "transcript")]
    Transcript(TranscriptMessage),
    #[serde(rename = "start_session")]
    StartSession { id: String },
    #[serde(rename = "end_session")]
    EndSession { id: String },
    #[serde(rename = "speech_start")]
    SpeechStart {
        #[serde(default)]
        session_id: Option<String>,
    },
    #[serde(rename = "speech_end")]
    SpeechEnd {
        #[serde(default)]
        session_id: Option<String>,
    },
    #[serde(rename = "start_recording")]
    StartRecording {
        #[serde(default)]
        session_id: Option<String>,
    },
    #[serde(rename = "end_recording")]
    EndRecording {
        #[serde(default)]
        session_id: Option<String>,
    },
    #[serde(rename = "error")]
    Error {
        message: String,
        #[serde(default)]
        code: Option<i32>,
    },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
struct TranscriptMessage {
    #[serde(default)]
    session_id: String,
    data: TranscriptData,
}

#[derive(Debug, Deserialize)]
struct TranscriptData {
    #[serde(default)]
    id: String,
    #[serde(default)]
    is_final: bool,
    utterance: Utterance,
}

#[derive(Debug, Deserialize)]
struct Utterance {
    #[serde(default)]
    text: String,
    #[serde(default)]
    start: f64,
    #[serde(default)]
    end: f64,
    #[serde(default)]
    language: Option<String>,
    #[serde(default)]
    channel: Option<i32>,
    #[serde(default)]
    words: Vec<GladiaWord>,
}

#[derive(Debug, Deserialize)]
struct GladiaWord {
    #[serde(default)]
    word: String,
    #[serde(default)]
    start: f64,
    #[serde(default)]
    end: f64,
    #[serde(default)]
    confidence: f64,
}

impl GladiaAdapter {
    fn parse_transcript(msg: TranscriptMessage) -> Vec<StreamResponse> {
        let data = msg.data;
        let utterance = data.utterance;

        tracing::debug!(
            transcript = %utterance.text,
            is_final = data.is_final,
            channel = ?utterance.channel,
            "gladia_transcript_received"
        );

        if utterance.text.is_empty() && utterance.words.is_empty() {
            return vec![];
        }

        let is_final = data.is_final;
        let speech_final = data.is_final;
        let from_finalize = false;

        let words: Vec<_> = utterance
            .words
            .iter()
            .map(|w| {
                WordBuilder::new(&w.word)
                    .start(w.start)
                    .end(w.end)
                    .confidence(w.confidence)
                    .language(utterance.language.clone())
                    .build()
            })
            .collect();

        let start = utterance.start;
        let duration = utterance.end - utterance.start;

        let channel = Channel {
            alternatives: vec![Alternatives {
                transcript: utterance.text,
                words,
                confidence: 1.0,
                languages: utterance.language.map(|l| vec![l]).unwrap_or_default(),
            }],
        };

        let channel_idx = utterance.channel.unwrap_or(0);
        // channel_index format: [channel_idx, total_channels]
        // Gladia returns channel index in utterance.channel (0-based)
        // Total channels is not provided in transcript response, so we infer from channel_idx
        let total_channels = (channel_idx + 1).max(1);

        vec![StreamResponse::TranscriptResponse {
            is_final,
            speech_final,
            from_finalize,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: vec![channel_idx, total_channels],
        }]
    }
}

#[cfg(test)]
mod tests {
    use super::GladiaAdapter;
    use crate::test_utils::{run_dual_test, run_single_test};
    use crate::ListenClient;

    #[tokio::test]
    #[ignore]
    async fn test_build_single() {
        let client = ListenClient::builder()
            .adapter::<GladiaAdapter>()
            .api_base("https://api.gladia.io")
            .api_key(std::env::var("GLADIA_API_KEY").expect("GLADIA_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single();

        run_single_test(client, "gladia").await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_build_dual() {
        let client = ListenClient::builder()
            .adapter::<GladiaAdapter>()
            .api_base("https://api.gladia.io")
            .api_key(std::env::var("GLADIA_API_KEY").expect("GLADIA_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual();

        run_dual_test(client, "gladia").await;
    }
}
