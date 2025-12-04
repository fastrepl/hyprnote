use std::path::{Path, PathBuf};
use std::time::Duration;

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};
use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word as BatchWord,
};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::AssemblyAIAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter};
use crate::error::Error;
use crate::polling::{poll_until, PollingConfig, PollingResult};

// API
// https://www.assemblyai.com/docs/api-reference/transcripts/submit.md
// https://www.assemblyai.com/docs/api-reference/transcripts/get.md
// Model & Language
// https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model.md
// https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages.md
impl BatchSttAdapter for AssemblyAIAdapter {
    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        let path = file_path.as_ref().to_path_buf();
        Box::pin(Self::do_transcribe_file(
            client, api_base, api_key, params, path,
        ))
    }
}

#[derive(Debug, Serialize)]
struct TranscriptRequest {
    audio_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    language_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    language_detection: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker_labels: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    multichannel: Option<bool>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    keyterms_prompt: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct UploadResponse {
    upload_url: String,
}

#[derive(Debug, Deserialize)]
struct TranscriptResponse {
    id: String,
    status: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    words: Option<Vec<AssemblyAIBatchWord>>,
    #[serde(default)]
    #[allow(dead_code)]
    utterances: Option<Vec<Utterance>>,
    #[serde(default)]
    confidence: Option<f64>,
    #[serde(default)]
    audio_duration: Option<u64>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AssemblyAIBatchWord {
    text: String,
    start: u64,
    end: u64,
    confidence: f64,
    #[serde(default)]
    speaker: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Utterance {
    #[serde(default)]
    text: String,
    #[serde(default)]
    start: u64,
    #[serde(default)]
    end: u64,
    #[serde(default)]
    confidence: f64,
    #[serde(default)]
    speaker: Option<String>,
    #[serde(default)]
    words: Vec<AssemblyAIBatchWord>,
}

impl AssemblyAIAdapter {
    async fn do_transcribe_file(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_path: PathBuf,
    ) -> Result<BatchResponse, Error> {
        let base_url = Self::batch_api_url(api_base);

        let audio_data = decode_audio_to_bytes(file_path).await?;

        let upload_url = format!("{}/upload", base_url);
        let upload_response = client
            .post(&upload_url)
            .header("Authorization", api_key)
            .header("Content-Type", "application/octet-stream")
            .body(audio_data)
            .send()
            .await?;

        let upload_status = upload_response.status();
        if !upload_status.is_success() {
            return Err(Error::UnexpectedStatus {
                status: upload_status,
                body: upload_response.text().await.unwrap_or_default(),
            });
        }

        let upload_result: UploadResponse = upload_response.json().await?;

        let language_code = params
            .languages
            .first()
            .map(|l| l.iso639().code().to_string());
        let language_detection = if params.languages.len() > 1 || params.languages.is_empty() {
            Some(true)
        } else {
            None
        };

        let transcript_request = TranscriptRequest {
            audio_url: upload_result.upload_url,
            language_code,
            language_detection,
            speaker_labels: Some(true),
            multichannel: None,
            keyterms_prompt: params.keywords.clone(),
        };

        let transcript_url = format!("{}/transcript", base_url);
        let create_response = client
            .post(&transcript_url)
            .header("Authorization", api_key)
            .header("Content-Type", "application/json")
            .json(&transcript_request)
            .send()
            .await?;

        let create_status = create_response.status();
        if !create_status.is_success() {
            return Err(Error::UnexpectedStatus {
                status: create_status,
                body: create_response.text().await.unwrap_or_default(),
            });
        }

        let create_result: TranscriptResponse = create_response.json().await?;
        let transcript_id = create_result.id;

        let poll_url = format!("{}/transcript/{}", base_url, transcript_id);

        let config = PollingConfig::default()
            .with_interval(Duration::from_secs(3))
            .with_timeout_error("transcription timed out".to_string());

        poll_until(
            || async {
                let poll_response = client
                    .get(&poll_url)
                    .header("Authorization", api_key)
                    .send()
                    .await?;

                let poll_status = poll_response.status();
                if !poll_status.is_success() {
                    return Err(Error::UnexpectedStatus {
                        status: poll_status,
                        body: poll_response.text().await.unwrap_or_default(),
                    });
                }

                let result: TranscriptResponse = poll_response.json().await?;

                match result.status.as_str() {
                    "completed" => Ok(PollingResult::Complete(Self::convert_to_batch_response(
                        result,
                    ))),
                    "error" => {
                        let error_msg = result.error.unwrap_or_else(|| "unknown error".to_string());
                        Ok(PollingResult::Failed(format!(
                            "transcription failed: {}",
                            error_msg
                        )))
                    }
                    _ => Ok(PollingResult::Continue),
                }
            },
            config,
        )
        .await
    }

    fn convert_to_batch_response(response: TranscriptResponse) -> BatchResponse {
        let words: Vec<BatchWord> = response
            .words
            .unwrap_or_default()
            .into_iter()
            .map(|w| {
                let speaker = w.speaker.and_then(|s| {
                    s.trim_start_matches(|c: char| !c.is_ascii_digit())
                        .parse::<usize>()
                        .ok()
                });

                BatchWord {
                    word: w.text.clone(),
                    start: w.start as f64 / 1000.0,
                    end: w.end as f64 / 1000.0,
                    confidence: w.confidence,
                    speaker,
                    punctuated_word: Some(w.text),
                }
            })
            .collect();

        let transcript = response.text.unwrap_or_default();
        let confidence = response.confidence.unwrap_or(1.0);

        let channel = BatchChannel {
            alternatives: vec![BatchAlternatives {
                transcript,
                confidence,
                words,
            }],
        };

        BatchResponse {
            metadata: serde_json::json!({
                "audio_duration": response.audio_duration,
            }),
            results: BatchResults {
                channels: vec![channel],
            },
        }
    }
}

async fn decode_audio_to_bytes(path: PathBuf) -> Result<bytes::Bytes, Error> {
    tokio::task::spawn_blocking(move || -> Result<bytes::Bytes, Error> {
        let decoder =
            source_from_path(&path).map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let channels = decoder.channels().max(1);
        let sample_rate = decoder.sample_rate();

        let samples = resample_audio(decoder, sample_rate)
            .map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let samples = if channels == 1 {
            samples
        } else {
            let channels_usize = channels as usize;
            let mut mono = Vec::with_capacity(samples.len() / channels_usize);
            for frame in samples.chunks(channels_usize) {
                if frame.is_empty() {
                    continue;
                }
                let sum: f32 = frame.iter().copied().sum();
                mono.push(sum / frame.len() as f32);
            }
            mono
        };

        if samples.is_empty() {
            return Err(Error::AudioProcessing(
                "audio file contains no samples".to_string(),
            ));
        }

        let bytes = f32_to_i16_bytes(samples.into_iter());

        Ok(bytes)
    })
    .await?
}
