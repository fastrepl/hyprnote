use hypr_ws::client::Message;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::SonioxAdapter;
use crate::adapter::RealtimeSttAdapter;

// https://soniox.com/docs/stt/rt/real-time-transcription
// https://soniox.com/docs/stt/api-reference/websocket-api
impl RealtimeSttAdapter for SonioxAdapter {
    fn provider_name(&self) -> &'static str {
        "soniox"
    }

    fn supports_native_multichannel(&self) -> bool {
        false
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

        let requested = params.model.as_deref().unwrap_or("stt-v3");
        let model = match requested {
            "stt-v3" => "stt-rt-v3",
            "stt-rt-preview" => "stt-rt-v3",
            other => other,
        };

        let context = if params.keywords.is_empty() {
            None
        } else {
            Some(Context {
                terms: params.keywords.clone(),
            })
        };

        let language_hints = params
            .languages
            .iter()
            .map(|lang| lang.iso639().code().to_string())
            .collect();

        let cfg = SonioxConfig {
            api_key,
            model,
            audio_format: "pcm_s16le",
            num_channels: channels,
            sample_rate: params.sample_rate,
            language_hints,
            enable_endpoint_detection: true,
            enable_speaker_diarization: true,
            context,
        };

        let json = serde_json::to_string(&cfg).unwrap();
        Some(Message::Text(json.into()))
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        let msg: SonioxMessage = match serde_json::from_str(raw) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = ?e, raw = raw, "soniox_json_parse_failed");
                return vec![];
            }
        };

        if let Some(error_msg) = &msg.error_message {
            tracing::error!(error_code = ?msg.error_code, error_message = %error_msg, "soniox_error");
            return vec![];
        }

        let has_fin_token = msg.tokens.iter().any(|t| t.text == "<fin>");
        let has_end_token = msg.tokens.iter().any(|t| t.text == "<end>");
        let is_finished = msg.finished.unwrap_or(false) || has_fin_token || has_end_token;

        let content_tokens: Vec<_> = msg
            .tokens
            .into_iter()
            .filter(|t| t.text != "<fin>" && t.text != "<end>")
            .collect();

        if content_tokens.is_empty() && !is_finished {
            return vec![];
        }

        let final_tokens: Vec<_> = content_tokens
            .iter()
            .filter(|t| t.is_final.unwrap_or(true))
            .collect();

        let non_final_tokens: Vec<_> = content_tokens
            .iter()
            .filter(|t| !t.is_final.unwrap_or(true))
            .collect();

        let mut responses = Vec::new();

        if !final_tokens.is_empty() {
            responses.push(Self::build_response(
                &final_tokens,
                true,
                is_finished,
                has_fin_token,
            ));
        }

        if !non_final_tokens.is_empty() {
            responses.push(Self::build_response(&non_final_tokens, false, false, false));
        }

        responses
    }

    fn finalize_message(&self) -> Message {
        Message::Text(r#"{"type":"finalize"}"#.into())
    }
}

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
    enable_endpoint_detection: bool,
    enable_speaker_diarization: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    context: Option<Context>,
}

#[derive(Debug, Deserialize)]
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
}

#[derive(Debug, Deserialize)]
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

#[derive(Debug, Deserialize)]
struct SonioxMessage {
    #[serde(default)]
    tokens: Vec<Token>,
    #[serde(default)]
    finished: Option<bool>,
    #[serde(default)]
    error_code: Option<i32>,
    #[serde(default)]
    error_message: Option<String>,
}

impl SonioxAdapter {
    fn build_response(
        tokens: &[&Token],
        is_final: bool,
        speech_final: bool,
        from_finalize: bool,
    ) -> StreamResponse {
        let mut words = Vec::with_capacity(tokens.len());
        let mut transcript = String::new();

        for t in tokens {
            if t.text.trim().is_empty() {
                transcript.push_str(&t.text);
                continue;
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

        let (start, duration) = if let (Some(first), Some(last)) = (tokens.first(), tokens.last()) {
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

        StreamResponse::TranscriptResponse {
            is_final,
            speech_final,
            from_finalize,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: vec![0, 1],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SonioxAdapter;
    use crate::test_utils::{run_dual_test, run_single_test};
    use crate::ListenClient;

    #[tokio::test]
    #[ignore]
    async fn test_build_single() {
        let client = ListenClient::builder()
            .adapter::<SonioxAdapter>()
            .api_base("https://api.soniox.com")
            .api_key(std::env::var("SONIOX_API_KEY").expect("SONIOX_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("stt-v3".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single();

        run_single_test(client, "soniox").await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_build_dual() {
        let client = ListenClient::builder()
            .adapter::<SonioxAdapter>()
            .api_base("https://api.soniox.com")
            .api_key(std::env::var("SONIOX_API_KEY").expect("SONIOX_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("stt-v3".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual();

        run_dual_test(client, "soniox").await;
    }
}
