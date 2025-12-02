use hypr_ws::client::Message;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::SonioxAdapter;
use crate::adapter::RealtimeSttAdapter;

impl RealtimeSttAdapter for SonioxAdapter {
    fn supports_native_multichannel(&self) -> bool {
        true
    }

    fn build_ws_url(&self, api_base: &str, _params: &ListenParams, _channels: u8) -> url::Url {
        let mut url: url::Url = api_base.parse().expect("invalid api_base");

        match url.scheme() {
            "http" => {
                let _ = url.set_scheme("ws");
            }
            "https" => {
                let _ = url.set_scheme("wss");
            }
            "ws" | "wss" => {}
            _ => {
                let _ = url.set_scheme("wss");
            }
        }

        url
    }

    fn build_auth_header(&self, _api_key: Option<&str>) -> Option<(&'static str, String)> {
        None
    }

    fn keep_alive_message(&self) -> Option<Message> {
        Some(Message::Text(r#"{"type":"keepalive"}"#.into()))
    }

    fn initial_message(
        &self,
        api_key: Option<&str>,
        params: &ListenParams,
        channels: u8,
    ) -> Option<Message> {
        let api_key = match api_key {
            Some(key) => key,
            None => {
                tracing::warn!("soniox_api_key_missing");
                return None;
            }
        };

        #[derive(Serialize)]
        struct Context {
            #[serde(skip_serializing_if = "Vec::is_empty")]
            terms: Vec<String>,
        }

        #[derive(Serialize)]
        struct SonioxConfig<'a> {
            api_key: &'a str,
            model: &'a str,
            audio_format: &'a str,
            num_channels: u8,
            sample_rate: u32,
            #[serde(skip_serializing_if = "Vec::is_empty")]
            language_hints: Vec<String>,
            include_nonfinal: bool,
            enable_endpoint_detection: bool,
            enable_speaker_diarization: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            context: Option<Context>,
        }

        let model = params.model.as_deref().unwrap_or("stt-rt-preview");

        let context = if params.keywords.is_empty() {
            None
        } else {
            Some(Context {
                terms: params.keywords.clone(),
            })
        };

        let cfg = SonioxConfig {
            api_key,
            model,
            audio_format: "pcm_s16le",
            num_channels: channels,
            sample_rate: params.sample_rate,
            language_hints: Self::language_hints(params),
            include_nonfinal: true,
            enable_endpoint_detection: true,
            enable_speaker_diarization: true,
            context,
        };

        let json = serde_json::to_string(&cfg).unwrap();
        Some(Message::Text(json.into()))
    }

    fn parse_response(&self, raw: &str) -> Option<StreamResponse> {
        #[derive(Deserialize)]
        struct Token {
            text: String,
            #[serde(default)]
            start_ms: Option<u64>,
            #[serde(default)]
            end_ms: Option<u64>,
            #[serde(default)]
            confidence: Option<f64>,
            #[serde(default)]
            is_final: Option<bool>,
            #[serde(default)]
            speaker: Option<SpeakerId>,
            #[serde(default)]
            channel: Option<u8>,
        }

        #[derive(Deserialize)]
        #[serde(untagged)]
        enum SpeakerId {
            Num(i32),
            Str(String),
        }

        impl SpeakerId {
            fn as_i32(&self) -> Option<i32> {
                match self {
                    SpeakerId::Num(n) => Some(*n),
                    SpeakerId::Str(s) => s
                        .trim_start_matches(|c: char| !c.is_ascii_digit())
                        .parse()
                        .ok(),
                }
            }
        }

        #[derive(Deserialize)]
        struct SonioxMessage {
            #[serde(default)]
            tokens: Vec<Token>,
            #[serde(default)]
            finished: Option<bool>,
            #[serde(default)]
            error: Option<String>,
        }

        let msg: SonioxMessage = match serde_json::from_str(raw) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = ?e, raw = raw, "soniox_json_parse_failed");
                return None;
            }
        };

        if let Some(error) = msg.error {
            tracing::error!(error = error, "soniox_error");
            return None;
        }

        let has_fin_token = msg.tokens.iter().any(|t| t.text == "<fin>");
        let is_finished = msg.finished.unwrap_or(false) || has_fin_token;

        let content_tokens: Vec<_> = msg
            .tokens
            .iter()
            .filter(|t| t.text != "<fin>" && t.text != "<end>")
            .collect();

        if content_tokens.is_empty() && !is_finished {
            return None;
        }

        let all_final = content_tokens.iter().all(|t| t.is_final.unwrap_or(true));

        let mut words = Vec::with_capacity(content_tokens.len());
        let mut transcript = String::new();

        let channel_index = content_tokens.first().and_then(|t| t.channel).unwrap_or(0) as i32;

        for t in &content_tokens {
            if !transcript.is_empty() && !t.text.starts_with(|c: char| c.is_ascii_punctuation()) {
                transcript.push(' ');
            }
            transcript.push_str(&t.text);

            let start_secs = t.start_ms.unwrap_or(0) as f64 / 1000.0;
            let end_secs = t.end_ms.unwrap_or(0) as f64 / 1000.0;
            let speaker = t.speaker.as_ref().and_then(|s| s.as_i32());

            words.push(Word {
                word: t.text.clone(),
                start: start_secs,
                end: end_secs,
                confidence: t.confidence.unwrap_or(1.0),
                speaker,
                punctuated_word: Some(t.text.clone()),
                language: None,
            });
        }

        let (start, duration) =
            if let (Some(first), Some(last)) = (content_tokens.first(), content_tokens.last()) {
                let start_secs = first.start_ms.unwrap_or(0) as f64 / 1000.0;
                let end_secs = last.end_ms.unwrap_or(0) as f64 / 1000.0;
                (start_secs, end_secs - start_secs)
            } else {
                (0.0, 0.0)
            };

        let channel = Channel {
            alternatives: vec![Alternatives {
                transcript,
                words,
                confidence: 1.0,
                languages: vec![],
            }],
        };

        Some(StreamResponse::TranscriptResponse {
            is_final: all_final || is_finished,
            speech_final: is_finished,
            from_finalize: has_fin_token,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: vec![channel_index, 1],
        })
    }

    fn finalize_message(&self) -> Message {
        Message::Text(r#"{"type":"finalize"}"#.into())
    }
}
