use hypr_ws::client::Message;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};
use owhisper_interface::ListenParams;
use serde::Deserialize;

use super::AssemblyAIAdapter;
use crate::adapter::RealtimeSttAdapter;

// https://www.assemblyai.com/docs/api-reference/streaming-api/streaming-api.md
impl RealtimeSttAdapter for AssemblyAIAdapter {
    fn supports_native_multichannel(&self) -> bool {
        // https://www.assemblyai.com/docs/universal-streaming/multichannel-streams.md
        false
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, _channels: u8) -> url::Url {
        let (mut url, existing_params) = Self::streaming_ws_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            for (key, value) in &existing_params {
                query_pairs.append_pair(key, value);
            }

            let sample_rate = params.sample_rate.to_string();
            query_pairs.append_pair("sample_rate", &sample_rate);
            query_pairs.append_pair("encoding", "pcm_s16le");
            query_pairs.append_pair("format_turns", "true");

            let model = params
                .model
                .as_deref()
                .unwrap_or("universal-streaming-english");

            let (speech_model, language, language_detection) =
                Self::resolve_language_config(model, params);

            query_pairs.append_pair("speech_model", speech_model);
            query_pairs.append_pair("language", language);
            if language_detection {
                query_pairs.append_pair("language_detection", "true");
            }

            if let Some(redemption_time) = params.redemption_time_ms {
                let max_silence = redemption_time.to_string();
                query_pairs.append_pair("max_turn_silence", &max_silence);
            }

            if !params.keywords.is_empty() {
                let keyterms_json = serde_json::to_string(&params.keywords).unwrap_or_default();
                query_pairs.append_pair("keyterms_prompt", &keyterms_json);
            }
        }

        url
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        api_key.map(|key| ("Authorization", key.to_string()))
    }

    fn keep_alive_message(&self) -> Option<Message> {
        None
    }

    fn finalize_message(&self) -> Message {
        Message::Text(r#"{"type":"Terminate"}"#.into())
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        let msg: AssemblyAIMessage = match serde_json::from_str(raw) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = ?e, raw = raw, "assemblyai_json_parse_failed");
                return vec![];
            }
        };

        match msg {
            AssemblyAIMessage::Begin { id, expires_at } => {
                tracing::debug!(session_id = %id, expires_at = %expires_at, "assemblyai_session_began");
                vec![]
            }
            AssemblyAIMessage::Turn(turn) => Self::parse_turn(turn),
            AssemblyAIMessage::Termination {
                audio_duration_seconds,
                session_duration_seconds,
            } => {
                tracing::debug!(
                    audio_duration = audio_duration_seconds,
                    session_duration = session_duration_seconds,
                    "assemblyai_session_terminated"
                );
                vec![StreamResponse::TerminalResponse {
                    request_id: String::new(),
                    created: String::new(),
                    duration: audio_duration_seconds as f64,
                    channels: 1,
                }]
            }
            AssemblyAIMessage::Error { error } => {
                tracing::error!(error = %error, "assemblyai_error");
                vec![]
            }
            AssemblyAIMessage::Unknown => {
                tracing::debug!(raw = raw, "assemblyai_unknown_message");
                vec![]
            }
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum AssemblyAIMessage {
    Begin {
        id: String,
        expires_at: u64,
    },
    Turn(TurnMessage),
    Termination {
        audio_duration_seconds: u64,
        session_duration_seconds: u64,
    },
    Error {
        error: String,
    },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
struct TurnMessage {
    #[serde(default)]
    #[allow(dead_code)]
    turn_order: u32,
    #[serde(default)]
    turn_is_formatted: bool,
    #[serde(default)]
    end_of_turn: bool,
    #[serde(default)]
    transcript: String,
    #[serde(default)]
    utterance: Option<String>,
    #[serde(default)]
    language_code: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    language_confidence: Option<f64>,
    #[serde(default)]
    end_of_turn_confidence: f64,
    #[serde(default)]
    words: Vec<AssemblyAIWord>,
}

#[derive(Debug, Deserialize)]
struct AssemblyAIWord {
    text: String,
    #[serde(default)]
    start: u64,
    #[serde(default)]
    end: u64,
    #[serde(default)]
    confidence: f64,
    #[serde(default)]
    #[allow(dead_code)]
    word_is_final: bool,
}

impl AssemblyAIAdapter {
    fn resolve_language_config(
        model: &str,
        params: &ListenParams,
    ) -> (&'static str, &'static str, bool) {
        let is_multilingual_model =
            matches!(model, "multilingual" | "universal-streaming-multilingual");

        let needs_multilingual = is_multilingual_model
            || params.languages.len() > 1
            || params
                .languages
                .first()
                .map(|l| l.iso639().code() != "en")
                .unwrap_or(false);

        if needs_multilingual {
            ("universal-streaming-multilingual", "multi", true)
        } else {
            ("universal-streaming-english", "en", false)
        }
    }

    fn parse_turn(turn: TurnMessage) -> Vec<StreamResponse> {
        tracing::debug!(
            transcript = %turn.transcript,
            utterance = ?turn.utterance,
            words_len = turn.words.len(),
            turn_is_formatted = turn.turn_is_formatted,
            end_of_turn = turn.end_of_turn,
            "assemblyai_turn_received"
        );

        if turn.transcript.is_empty() && turn.words.is_empty() {
            return vec![];
        }

        let is_final = turn.turn_is_formatted || turn.end_of_turn;
        let speech_final = turn.end_of_turn;
        let from_finalize = false;

        let words: Vec<Word> = turn
            .words
            .iter()
            .map(|w| {
                let start_secs = w.start as f64 / 1000.0;
                let end_secs = w.end as f64 / 1000.0;

                Word {
                    word: w.text.clone(),
                    start: start_secs,
                    end: end_secs,
                    confidence: w.confidence,
                    speaker: None,
                    punctuated_word: Some(w.text.clone()),
                    language: turn.language_code.clone(),
                }
            })
            .collect();

        let (start, duration) = if let (Some(first), Some(last)) = (words.first(), words.last()) {
            (first.start, last.end - first.start)
        } else {
            (0.0, 0.0)
        };

        let transcript = if turn.turn_is_formatted {
            turn.transcript.clone()
        } else if let Some(ref utt) = turn.utterance {
            if !utt.is_empty() {
                utt.clone()
            } else if !turn.transcript.is_empty() {
                turn.transcript.clone()
            } else {
                words
                    .iter()
                    .map(|w| w.word.as_str())
                    .collect::<Vec<_>>()
                    .join(" ")
            }
        } else if !turn.transcript.is_empty() {
            turn.transcript.clone()
        } else {
            words
                .iter()
                .map(|w| w.word.as_str())
                .collect::<Vec<_>>()
                .join(" ")
        };

        let channel = Channel {
            alternatives: vec![Alternatives {
                transcript,
                words,
                confidence: turn.end_of_turn_confidence,
                languages: turn.language_code.map(|l| vec![l]).unwrap_or_default(),
            }],
        };

        vec![StreamResponse::TranscriptResponse {
            is_final,
            speech_final,
            from_finalize,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: vec![0, 1],
        }]
    }
}

#[cfg(test)]
mod tests {
    use super::AssemblyAIAdapter;
    use crate::test_utils::{run_dual_test, run_single_test};
    use crate::ListenClient;

    #[tokio::test]
    #[ignore]
    async fn test_build_single() {
        let client = ListenClient::builder()
            .adapter::<AssemblyAIAdapter>()
            .api_base("wss://streaming.assemblyai.com")
            .api_key(std::env::var("ASSEMBLYAI_API_KEY").expect("ASSEMBLYAI_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("universal-streaming-english".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single();

        run_single_test(client, "assemblyai").await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_build_dual() {
        let client = ListenClient::builder()
            .adapter::<AssemblyAIAdapter>()
            .api_base("wss://streaming.assemblyai.com")
            .api_key(std::env::var("ASSEMBLYAI_API_KEY").expect("ASSEMBLYAI_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("universal-streaming-english".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual();

        run_dual_test(client, "assemblyai").await;
    }
}
