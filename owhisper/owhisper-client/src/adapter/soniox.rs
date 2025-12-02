use std::path::Path;
use std::time::Duration;

use hypr_ws::client::Message;
use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word as BatchWord,
};
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::{BatchFuture, SttAdapter};
use crate::error::Error;

const DEFAULT_API_BASE: &str = "https://api.soniox.com";
const POLL_INTERVAL: Duration = Duration::from_secs(2);
const MAX_POLL_ATTEMPTS: u32 = 300;

#[derive(Clone, Default)]
pub struct SonioxAdapter;

impl SonioxAdapter {
    fn language_hints(params: &ListenParams) -> Vec<String> {
        params
            .languages
            .iter()
            .map(|lang| lang.iso639().code().to_string())
            .collect()
    }

    fn api_base_url(api_base: &str) -> String {
        if api_base.is_empty() {
            DEFAULT_API_BASE.to_string()
        } else {
            api_base.trim_end_matches('/').to_string()
        }
    }

    async fn upload_file(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        file_path: &Path,
    ) -> Result<String, Error> {
        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("audio.wav")
            .to_string();

        let file_bytes = tokio::fs::read(file_path).await.map_err(|e| {
            Error::AudioProcessing(format!(
                "failed to read file {}: {}",
                file_path.display(),
                e
            ))
        })?;

        let part = reqwest::multipart::Part::bytes(file_bytes).file_name(file_name);
        let form = reqwest::multipart::Form::new().part("file", part);

        let url = format!("{}/v1/files", Self::api_base_url(api_base));
        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .multipart(form)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(Error::UnexpectedStatus { status, body });
        }

        #[derive(Deserialize)]
        struct FileUploadResponse {
            id: String,
        }

        let upload_response: FileUploadResponse = response.json().await?;
        Ok(upload_response.id)
    }

    async fn create_transcription(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_id: &str,
    ) -> Result<String, Error> {
        #[derive(Serialize)]
        struct Context {
            #[serde(skip_serializing_if = "Vec::is_empty")]
            terms: Vec<String>,
        }

        #[derive(Serialize)]
        struct CreateTranscriptionRequest<'a> {
            model: &'a str,
            file_id: &'a str,
            #[serde(skip_serializing_if = "Vec::is_empty")]
            language_hints: Vec<String>,
            enable_speaker_diarization: bool,
            enable_language_identification: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            context: Option<Context>,
        }

        let model = params.model.as_deref().unwrap_or("stt-async-preview");

        let context = if params.keywords.is_empty() {
            None
        } else {
            Some(Context {
                terms: params.keywords.clone(),
            })
        };

        let request = CreateTranscriptionRequest {
            model,
            file_id,
            language_hints: Self::language_hints(params),
            enable_speaker_diarization: true,
            enable_language_identification: true,
            context,
        };

        let url = format!("{}/v1/transcriptions", Self::api_base_url(api_base));
        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(Error::UnexpectedStatus { status, body });
        }

        #[derive(Deserialize)]
        struct TranscriptionResponse {
            id: String,
        }

        let transcription: TranscriptionResponse = response.json().await?;
        Ok(transcription.id)
    }

    async fn poll_transcription(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        transcription_id: &str,
    ) -> Result<(), Error> {
        #[derive(Deserialize)]
        struct TranscriptionResponse {
            status: String,
            #[serde(default)]
            error_message: Option<String>,
        }

        let url = format!(
            "{}/v1/transcriptions/{}",
            Self::api_base_url(api_base),
            transcription_id
        );

        for attempt in 0..MAX_POLL_ATTEMPTS {
            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .send()
                .await?;

            let status = response.status();
            if !status.is_success() {
                let body = response.text().await.unwrap_or_default();
                return Err(Error::UnexpectedStatus { status, body });
            }

            let transcription: TranscriptionResponse = response.json().await?;

            match transcription.status.as_str() {
                "completed" => return Ok(()),
                "error" => {
                    let error_msg = transcription
                        .error_message
                        .unwrap_or_else(|| "unknown error".to_string());
                    return Err(Error::AudioProcessing(format!(
                        "transcription failed: {}",
                        error_msg
                    )));
                }
                "queued" | "processing" => {
                    tracing::debug!(
                        attempt = attempt,
                        status = transcription.status,
                        "polling transcription status"
                    );
                    tokio::time::sleep(POLL_INTERVAL).await;
                }
                unknown => {
                    return Err(Error::AudioProcessing(format!(
                        "unexpected transcription status: {}",
                        unknown
                    )));
                }
            }
        }

        Err(Error::AudioProcessing(format!(
            "transcription timed out after {} attempts",
            MAX_POLL_ATTEMPTS
        )))
    }

    async fn get_transcript(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        transcription_id: &str,
    ) -> Result<BatchResponse, Error> {
        #[derive(Deserialize)]
        struct TranscriptResponse {
            text: String,
            tokens: Vec<TranscriptToken>,
        }

        #[derive(Deserialize)]
        struct TranscriptToken {
            text: String,
            #[serde(default)]
            start_ms: Option<u64>,
            #[serde(default)]
            end_ms: Option<u64>,
            #[serde(default)]
            confidence: Option<f64>,
            #[serde(default)]
            speaker: Option<BatchSpeakerId>,
        }

        #[derive(Deserialize)]
        #[serde(untagged)]
        enum BatchSpeakerId {
            Num(i32),
            Str(String),
        }

        impl BatchSpeakerId {
            fn as_usize(&self) -> Option<usize> {
                match self {
                    BatchSpeakerId::Num(n) if *n >= 0 => Some(*n as usize),
                    BatchSpeakerId::Num(_) => None,
                    BatchSpeakerId::Str(s) => s
                        .trim_start_matches(|c: char| !c.is_ascii_digit())
                        .parse()
                        .ok(),
                }
            }
        }

        let url = format!(
            "{}/v1/transcriptions/{}/transcript",
            Self::api_base_url(api_base),
            transcription_id
        );

        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(Error::UnexpectedStatus { status, body });
        }

        let transcript: TranscriptResponse = response.json().await?;

        let words: Vec<BatchWord> = transcript
            .tokens
            .iter()
            .map(|token| BatchWord {
                word: token.text.clone(),
                start: token.start_ms.unwrap_or(0) as f64 / 1000.0,
                end: token.end_ms.unwrap_or(0) as f64 / 1000.0,
                confidence: token.confidence.unwrap_or(1.0),
                speaker: token.speaker.as_ref().and_then(|s| s.as_usize()),
                punctuated_word: Some(token.text.clone()),
            })
            .collect();

        let alternatives = BatchAlternatives {
            transcript: transcript.text,
            confidence: 1.0,
            words,
        };

        let channel = BatchChannel {
            alternatives: vec![alternatives],
        };

        Ok(BatchResponse {
            metadata: serde_json::json!({}),
            results: BatchResults {
                channels: vec![channel],
            },
        })
    }

    async fn do_transcribe_file(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_path: &Path,
    ) -> Result<BatchResponse, Error> {
        tracing::info!(path = %file_path.display(), "uploading file to Soniox");

        let file_id = Self::upload_file(client, api_base, api_key, file_path).await?;
        tracing::info!(file_id = %file_id, "file uploaded, creating transcription");

        let transcription_id =
            Self::create_transcription(client, api_base, api_key, params, &file_id).await?;
        tracing::info!(transcription_id = %transcription_id, "transcription created, polling for completion");

        Self::poll_transcription(client, api_base, api_key, &transcription_id).await?;
        tracing::info!(transcription_id = %transcription_id, "transcription completed, fetching transcript");

        let response = Self::get_transcript(client, api_base, api_key, &transcription_id).await?;
        tracing::info!("transcript fetched successfully");

        Ok(response)
    }
}

impl SttAdapter for SonioxAdapter {
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

        // https://soniox.com/docs/stt/api-reference/websocket-api#configuration
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
            // TODO
            channel_index: vec![channel_index, 1],
        })
    }

    fn finalize_message(&self) -> Message {
        Message::Text(r#"{"type":"finalize"}"#.into())
    }

    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        let path = file_path.as_ref().to_path_buf();
        Box::pin(
            async move { Self::do_transcribe_file(client, api_base, api_key, params, &path).await },
        )
    }
}
