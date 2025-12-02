use std::path::Path;
use std::time::Duration;

use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word as BatchWord,
};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::SonioxAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter};
use crate::error::Error;

const POLL_INTERVAL: Duration = Duration::from_secs(2);
const MAX_POLL_ATTEMPTS: u32 = 300;

impl SonioxAdapter {
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

        let url = format!("https://{}/v1/files", Self::api_host(api_base));
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

        let language_hints = params
            .languages
            .iter()
            .map(|lang| lang.iso639().code().to_string())
            .collect();

        let request = CreateTranscriptionRequest {
            model,
            file_id,
            language_hints,
            enable_speaker_diarization: true,
            enable_language_identification: true,
            context,
        };

        let url = format!("https://{}/v1/transcriptions", Self::api_host(api_base));
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
            "https://{}/v1/transcriptions/{}",
            Self::api_host(api_base),
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
            "https://{}/v1/transcriptions/{}/transcript",
            Self::api_host(api_base),
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

impl BatchSttAdapter for SonioxAdapter {
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
