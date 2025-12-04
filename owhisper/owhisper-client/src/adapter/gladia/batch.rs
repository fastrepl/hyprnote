use std::path::{Path, PathBuf};
use std::time::Duration;

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};
use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word as BatchWord,
};
use owhisper_interface::ListenParams;
use serde::{Deserialize, Serialize};

use super::GladiaAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter};
use crate::error::Error;
use crate::polling::{poll_until, PollingConfig, PollingResult};

impl BatchSttAdapter for GladiaAdapter {
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
    language_config: Option<LanguageConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    diarization: Option<bool>,
}

#[derive(Debug, Serialize)]
struct LanguageConfig {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    languages: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    code_switching: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct UploadResponse {
    audio_url: String,
}

#[derive(Debug, Deserialize)]
struct InitResponse {
    id: String,
}

#[derive(Debug, Deserialize)]
struct TranscriptResponse {
    status: String,
    #[serde(default)]
    error_code: Option<String>,
    #[serde(default)]
    file: Option<FileInfo>,
    #[serde(default)]
    result: Option<TranscriptResult>,
}

#[derive(Debug, Deserialize)]
struct FileInfo {
    #[serde(default)]
    audio_duration: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct TranscriptResult {
    #[serde(default)]
    metadata: Option<ResultMetadata>,
    #[serde(default)]
    transcription: Option<Transcription>,
}

#[derive(Debug, Deserialize)]
struct ResultMetadata {
    #[serde(default)]
    audio_duration: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct Transcription {
    #[serde(default)]
    full_transcript: Option<String>,
    #[serde(default)]
    utterances: Vec<Utterance>,
}

#[derive(Debug, Deserialize)]
struct Utterance {
    text: String,
    #[serde(default)]
    start: f64,
    #[serde(default)]
    end: f64,
    #[serde(default)]
    confidence: f64,
    #[serde(default)]
    channel: usize,
    #[serde(default)]
    speaker: Option<usize>,
    #[serde(default)]
    words: Vec<GladiaWord>,
}

#[derive(Debug, Deserialize)]
struct GladiaWord {
    word: String,
    #[serde(default)]
    start: f64,
    #[serde(default)]
    end: f64,
    #[serde(default)]
    confidence: f64,
}

impl GladiaAdapter {
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
        let form = reqwest::multipart::Form::new().part(
            "audio",
            reqwest::multipart::Part::bytes(audio_data.to_vec())
                .file_name("audio.wav")
                .mime_str("audio/wav")
                .map_err(|e| Error::AudioProcessing(e.to_string()))?,
        );

        let upload_response = client
            .post(&upload_url)
            .header("x-gladia-key", api_key)
            .multipart(form)
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

        let languages: Vec<String> = params
            .languages
            .iter()
            .map(|l| l.iso639().code().to_string())
            .collect();

        let language_config = if languages.is_empty() {
            None
        } else {
            Some(LanguageConfig {
                languages,
                code_switching: if params.languages.len() > 1 {
                    Some(true)
                } else {
                    None
                },
            })
        };

        let transcript_request = TranscriptRequest {
            audio_url: upload_result.audio_url,
            language_config,
            diarization: Some(true),
        };

        let transcript_url = format!("{}/pre-recorded", base_url);
        let create_response = client
            .post(&transcript_url)
            .header("x-gladia-key", api_key)
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

        let create_result: InitResponse = create_response.json().await?;
        let transcript_id = create_result.id;

        let poll_url = format!("{}/pre-recorded/{}", base_url, transcript_id);

        let config = PollingConfig::default()
            .with_interval(Duration::from_secs(3))
            .with_timeout_error("transcription timed out".to_string());

        poll_until(
            || async {
                let poll_response = client
                    .get(&poll_url)
                    .header("x-gladia-key", api_key)
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
                    "done" => Ok(PollingResult::Complete(Self::convert_to_batch_response(
                        result,
                    ))),
                    "error" => {
                        let error_msg = result
                            .error_code
                            .unwrap_or_else(|| "unknown error".to_string());
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
        let result = response.result.unwrap_or(TranscriptResult {
            metadata: None,
            transcription: None,
        });

        let transcription = result.transcription.unwrap_or(Transcription {
            full_transcript: None,
            utterances: Vec::new(),
        });

        let words: Vec<BatchWord> = transcription
            .utterances
            .iter()
            .flat_map(|u| {
                u.words.iter().map(|w| BatchWord {
                    word: w.word.trim().to_string(),
                    start: w.start,
                    end: w.end,
                    confidence: w.confidence,
                    speaker: u.speaker,
                    punctuated_word: Some(w.word.clone()),
                })
            })
            .collect();

        let transcript = transcription.full_transcript.unwrap_or_default();

        let avg_confidence = if words.is_empty() {
            1.0
        } else {
            words.iter().map(|w| w.confidence).sum::<f64>() / words.len() as f64
        };

        let channel = BatchChannel {
            alternatives: vec![BatchAlternatives {
                transcript,
                confidence: avg_confidence,
                words,
            }],
        };

        let audio_duration = result
            .metadata
            .and_then(|m| m.audio_duration)
            .or_else(|| response.file.and_then(|f| f.audio_duration));

        BatchResponse {
            metadata: serde_json::json!({
                "audio_duration": audio_duration,
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
