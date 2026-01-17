use hypr_ws_client::client::Message;
use owhisper_interface::ListenParams;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse};
use serde::{Deserialize, Serialize};

use super::SpeechmaticsAdapter;
use crate::adapter::RealtimeSttAdapter;
use crate::adapter::parsing::{WordBuilder, calculate_time_span};

impl RealtimeSttAdapter for SpeechmaticsAdapter {
    fn provider_name(&self) -> &'static str {
        "speechmatics"
    }

    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        SpeechmaticsAdapter::is_supported_languages_live(languages)
    }

    fn supports_native_multichannel(&self) -> bool {
        true
    }

    fn build_ws_url(&self, api_base: &str, _params: &ListenParams, _channels: u8) -> url::Url {
        let (mut url, existing_params) = Self::streaming_ws_url(api_base);

        if !existing_params.is_empty() {
            let mut query_pairs = url.query_pairs_mut();
            for (key, value) in &existing_params {
                query_pairs.append_pair(key, value);
            }
        }

        url
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        api_key.and_then(|k| crate::providers::Provider::Speechmatics.build_auth_header(k))
    }

    fn keep_alive_message(&self) -> Option<Message> {
        None
    }

    fn initial_message(
        &self,
        _api_key: Option<&str>,
        params: &ListenParams,
        _channels: u8,
    ) -> Option<Message> {
        let language = params
            .languages
            .first()
            .map(|l| l.iso639().code().to_string())
            .unwrap_or_else(|| "en".to_string());

        let additional_vocab: Vec<AdditionalVocab> = params
            .keywords
            .iter()
            .map(|k| AdditionalVocab {
                content: k.clone(),
                sounds_like: None,
            })
            .collect();

        let default = crate::providers::Provider::Speechmatics.default_live_model();
        let operating_point = match params.model.as_deref() {
            Some(m) if crate::providers::is_meta_model(m) => default,
            Some(m) => m,
            None => default,
        };

        let transcription_config = TranscriptionConfig {
            language,
            operating_point: operating_point.to_string(),
            enable_partials: true,
            enable_entities: true,
            diarization: "speaker".to_string(),
            additional_vocab: if additional_vocab.is_empty() {
                None
            } else {
                Some(additional_vocab)
            },
            max_delay: Some(2.0),
            max_delay_mode: Some("flexible".to_string()),
        };

        let audio_format = AudioFormat {
            format_type: "raw".to_string(),
            encoding: "pcm_s16le".to_string(),
            sample_rate: params.sample_rate,
        };

        let start_recognition = StartRecognition {
            message: "StartRecognition".to_string(),
            audio_format,
            transcription_config,
        };

        let json = serde_json::to_string(&start_recognition).unwrap();
        Some(Message::Text(json.into()))
    }

    fn finalize_message(&self) -> Message {
        Message::Text(r#"{"message":"EndOfStream","last_seq_no":0}"#.into())
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        let msg: SpeechmaticsMessage = match serde_json::from_str(raw) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = ?e, raw = raw, "speechmatics_json_parse_failed");
                return vec![];
            }
        };

        match msg {
            SpeechmaticsMessage::RecognitionStarted { id } => {
                tracing::debug!(session_id = %id, "speechmatics_session_started");
                vec![]
            }
            SpeechmaticsMessage::AudioAdded { seq_no } => {
                tracing::trace!(seq_no = seq_no, "speechmatics_audio_added");
                vec![]
            }
            SpeechmaticsMessage::AddTranscript { results, metadata } => {
                Self::parse_transcript(results, metadata, true, false)
            }
            SpeechmaticsMessage::AddPartialTranscript { results, metadata } => {
                Self::parse_transcript(results, metadata, false, false)
            }
            SpeechmaticsMessage::EndOfTranscript => {
                tracing::debug!("speechmatics_end_of_transcript");
                vec![StreamResponse::TerminalResponse {
                    request_id: String::new(),
                    created: String::new(),
                    duration: 0.0,
                    channels: 1,
                }]
            }
            SpeechmaticsMessage::Error { code, reason } => {
                tracing::error!(code = code, reason = %reason, "speechmatics_error");
                vec![StreamResponse::ErrorResponse {
                    error_code: Some(code),
                    error_message: reason,
                    provider: "speechmatics".to_string(),
                }]
            }
            SpeechmaticsMessage::Warning { code, reason } => {
                tracing::warn!(code = code, reason = %reason, "speechmatics_warning");
                vec![]
            }
            SpeechmaticsMessage::Unknown => {
                tracing::debug!(raw = raw, "speechmatics_unknown_message");
                vec![]
            }
        }
    }
}

#[derive(Debug, Serialize)]
struct StartRecognition {
    message: String,
    audio_format: AudioFormat,
    transcription_config: TranscriptionConfig,
}

#[derive(Debug, Serialize)]
struct AudioFormat {
    #[serde(rename = "type")]
    format_type: String,
    encoding: String,
    sample_rate: u32,
}

#[derive(Debug, Serialize)]
struct TranscriptionConfig {
    language: String,
    operating_point: String,
    enable_partials: bool,
    enable_entities: bool,
    diarization: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    additional_vocab: Option<Vec<AdditionalVocab>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_delay: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_delay_mode: Option<String>,
}

#[derive(Debug, Serialize)]
struct AdditionalVocab {
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    sounds_like: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "message")]
enum SpeechmaticsMessage {
    RecognitionStarted {
        id: String,
    },
    AudioAdded {
        seq_no: u64,
    },
    AddTranscript {
        #[serde(default)]
        results: Vec<TranscriptResult>,
        #[serde(default)]
        metadata: TranscriptMetadata,
    },
    AddPartialTranscript {
        #[serde(default)]
        results: Vec<TranscriptResult>,
        #[serde(default)]
        metadata: TranscriptMetadata,
    },
    EndOfTranscript,
    Error {
        code: i32,
        reason: String,
    },
    Warning {
        code: i32,
        reason: String,
    },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Default, Deserialize)]
struct TranscriptMetadata {
    #[serde(default)]
    start_time: f64,
    #[serde(default)]
    end_time: f64,
    #[serde(default)]
    transcript: String,
}

#[derive(Debug, Deserialize)]
struct TranscriptResult {
    #[serde(default)]
    #[serde(rename = "type")]
    result_type: String,
    #[serde(default)]
    start_time: f64,
    #[serde(default)]
    end_time: f64,
    #[serde(default)]
    alternatives: Vec<TranscriptAlternative>,
    #[serde(default)]
    is_eos: bool,
    #[serde(default)]
    attaches_to: Option<String>,
    #[serde(default)]
    speaker: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TranscriptAlternative {
    #[serde(default)]
    content: String,
    #[serde(default)]
    confidence: f64,
    #[serde(default)]
    language: Option<String>,
    #[serde(default)]
    speaker: Option<String>,
}

impl SpeechmaticsAdapter {
    fn parse_transcript(
        results: Vec<TranscriptResult>,
        metadata: TranscriptMetadata,
        is_final: bool,
        from_finalize: bool,
    ) -> Vec<StreamResponse> {
        if results.is_empty() && metadata.transcript.is_empty() {
            return vec![];
        }

        let mut words = Vec::new();
        let mut transcript = String::new();
        let mut speech_final = false;

        for result in &results {
            if result.result_type == "word" {
                if let Some(alt) = result.alternatives.first() {
                    let speaker = result
                        .speaker
                        .as_ref()
                        .or(alt.speaker.as_ref())
                        .and_then(|s| {
                            s.trim_start_matches(|c: char| !c.is_ascii_digit())
                                .parse::<i32>()
                                .ok()
                        });

                    words.push(
                        WordBuilder::new(&alt.content)
                            .start(result.start_time)
                            .end(result.end_time)
                            .confidence(alt.confidence)
                            .speaker(speaker)
                            .language(alt.language.clone())
                            .build(),
                    );

                    if !transcript.is_empty()
                        && !alt.content.starts_with(|c: char| c.is_ascii_punctuation())
                    {
                        transcript.push(' ');
                    }
                    transcript.push_str(&alt.content);
                }
            } else if result.result_type == "punctuation" {
                if let Some(alt) = result.alternatives.first() {
                    transcript.push_str(&alt.content);
                }
            }

            if result.is_eos {
                speech_final = true;
            }
        }

        if transcript.is_empty() && !metadata.transcript.is_empty() {
            transcript = metadata.transcript;
        }

        if words.is_empty() && transcript.is_empty() {
            return vec![];
        }

        let (start, duration) = calculate_time_span(&words);

        let channel = Channel {
            alternatives: vec![Alternatives {
                transcript,
                words,
                confidence: 1.0,
                languages: vec![],
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
    use hypr_language::ISO639;

    use super::SpeechmaticsAdapter;
    use crate::ListenClient;
    use crate::test_utils::{UrlTestCase, run_dual_test, run_single_test, run_url_test_cases};

    const API_BASE: &str = "https://eu.rt.speechmatics.com";

    #[test]
    fn test_base_url() {
        run_url_test_cases(
            &SpeechmaticsAdapter::default(),
            API_BASE,
            &[UrlTestCase {
                name: "base_url_structure",
                model: None,
                languages: &[ISO639::En],
                contains: &["speechmatics.com"],
                not_contains: &[],
            }],
        );
    }

    macro_rules! single_test {
        ($name:ident, $params:expr) => {
            #[tokio::test]
            #[ignore]
            async fn $name() {
                let client = ListenClient::builder()
                    .adapter::<SpeechmaticsAdapter>()
                    .api_base("wss://eu.rt.speechmatics.com")
                    .api_key(
                        std::env::var("SPEECHMATICS_API_KEY")
                            .expect("SPEECHMATICS_API_KEY not set"),
                    )
                    .params($params)
                    .build_single()
                    .await;
                run_single_test(client, "speechmatics").await;
            }
        };
    }

    single_test!(
        test_build_single,
        owhisper_interface::ListenParams {
            model: Some("enhanced".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            ..Default::default()
        }
    );

    single_test!(
        test_single_with_keywords,
        owhisper_interface::ListenParams {
            model: Some("enhanced".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            keywords: vec!["Hyprnote".to_string(), "transcription".to_string()],
            ..Default::default()
        }
    );

    single_test!(
        test_single_multi_lang_1,
        owhisper_interface::ListenParams {
            model: Some("enhanced".to_string()),
            languages: vec![
                hypr_language::ISO639::En.into(),
                hypr_language::ISO639::Es.into(),
            ],
            ..Default::default()
        }
    );

    #[tokio::test]
    #[ignore]
    async fn test_build_dual() {
        let client = ListenClient::builder()
            .adapter::<SpeechmaticsAdapter>()
            .api_base("wss://eu.rt.speechmatics.com")
            .api_key(std::env::var("SPEECHMATICS_API_KEY").expect("SPEECHMATICS_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("enhanced".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual()
            .await;

        run_dual_test(client, "speechmatics").await;
    }
}
