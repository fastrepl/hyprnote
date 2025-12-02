use hypr_ws::client::Message;
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};
use owhisper_interface::ListenParams;
use serde::Deserialize;

use super::AssemblyAIAdapter;
use crate::adapter::RealtimeSttAdapter;

impl RealtimeSttAdapter for AssemblyAIAdapter {
    fn supports_native_multichannel(&self) -> bool {
        false
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, _channels: u8) -> url::Url {
        let mut url = Self::streaming_ws_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            let sample_rate = params.sample_rate.to_string();
            query_pairs.append_pair("sample_rate", &sample_rate);
            query_pairs.append_pair("encoding", "pcm_s16le");
            query_pairs.append_pair("format_turns", "true");

            let model = params
                .model
                .as_deref()
                .unwrap_or("universal-streaming-english");
            let speech_model = match model {
                "multilingual" | "universal-streaming-multilingual" => {
                    "universal-streaming-multilingual"
                }
                _ => "universal-streaming-english",
            };
            query_pairs.append_pair("speech_model", speech_model);

            if !params.languages.is_empty() {
                if params.languages.len() > 1 || speech_model == "universal-streaming-multilingual"
                {
                    query_pairs.append_pair("language_detection", "true");
                } else if let Some(lang) = params.languages.first() {
                    let code = lang.iso639().code();
                    if code != "en" {
                        query_pairs.append_pair("speech_model", "universal-streaming-multilingual");
                        query_pairs.append_pair("language_detection", "true");
                    }
                }
            }

            if !params.keywords.is_empty() {
                let keyterms_json = serde_json::to_string(&params.keywords).unwrap_or_default();
                query_pairs.append_pair("keyterms_prompt", &keyterms_json);
            }
        }

        url
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        // AssemblyAI accepts the API key directly in the Authorization header (no Bearer prefix)
        api_key.map(|key| ("authorization", key.to_string()))
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
            AssemblyAIMessage::Begin { .. } => {
                tracing::debug!("assemblyai_session_began");
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
        #[allow(dead_code)]
        id: String,
        #[allow(dead_code)]
        expires_at: u64,
    },
    Turn(TurnMessage),
    Termination {
        audio_duration_seconds: u64,
        session_duration_seconds: u64,
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
    fn parse_turn(turn: TurnMessage) -> Vec<StreamResponse> {
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
        } else {
            turn.utterance.clone().unwrap_or(turn.transcript.clone())
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
    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;

    use super::AssemblyAIAdapter;
    use crate::live::{FinalizeHandle, ListenClientInput};
    use crate::ListenClient;

    #[tokio::test]
    async fn test_client() {
        let _ = tracing_subscriber::fmt::try_init();

        // AssemblyAI requires audio chunks between 50ms and 1000ms
        // Using 1600 samples at 16kHz = 100ms per chunk
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 1600);

        let input = Box::pin(tokio_stream::StreamExt::throttle(
            audio.map(|chunk| ListenClientInput::Audio(chunk)),
            std::time::Duration::from_millis(100),
        ));

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

        let (stream, handle) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        let mut saw_transcript = false;
        while let Some(result) = stream.next().await {
            match result {
                Ok(response) => match response {
                    owhisper_interface::stream::StreamResponse::TranscriptResponse {
                        channel,
                        ..
                    } => {
                        saw_transcript = true;
                        println!(
                            "Transcript: {:?}",
                            channel.alternatives.first().unwrap().transcript
                        );
                        // Break after receiving first transcript to avoid waiting for stream to end
                        break;
                    }
                    _ => {}
                },
                Err(e) => {
                    println!("Error: {:?}", e);
                    break;
                }
            }
        }

        // Finalize the connection
        handle.finalize().await;

        assert!(
            saw_transcript,
            "expected at least one transcript from AssemblyAI"
        );
    }
}
