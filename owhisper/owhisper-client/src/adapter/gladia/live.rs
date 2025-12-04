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

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        api_key.map(|key| ("x-gladia-key", key.to_string()))
    }

    fn keep_alive_message(&self) -> Option<Message> {
        None
    }

    fn initial_message(
        &self,
        _api_key: Option<&str>,
        params: &ListenParams,
        channels: u8,
    ) -> Option<Message> {
        let language_config = if params.languages.is_empty() {
            None
        } else if params.languages.len() == 1 {
            Some(LanguageConfig::Single(
                params.languages[0].iso639().code().to_string(),
            ))
        } else {
            Some(LanguageConfig::CodeSwitching(CodeSwitchingConfig {
                languages: params
                    .languages
                    .iter()
                    .map(|l| l.iso639().code().to_string())
                    .collect(),
            }))
        };

        let custom_vocabulary = if params.keywords.is_empty() {
            None
        } else {
            Some(params.keywords.clone())
        };

        let cfg = GladiaConfig {
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

        let json = serde_json::to_string(&cfg).unwrap();
        Some(Message::Text(json.into()))
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
#[serde(untagged)]
enum LanguageConfig {
    Single(String),
    CodeSwitching(CodeSwitchingConfig),
}

#[derive(Serialize)]
struct CodeSwitchingConfig {
    languages: Vec<String>,
}

#[derive(Serialize)]
struct MessagesConfig {
    receive_partial_transcripts: bool,
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

        vec![StreamResponse::TranscriptResponse {
            is_final,
            speech_final,
            from_finalize,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: vec![channel_idx, 1],
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
