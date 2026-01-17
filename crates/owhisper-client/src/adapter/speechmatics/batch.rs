use std::path::{Path, PathBuf};
use std::time::Duration;

use owhisper_interface::ListenParams;
use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults, Word as BatchWord,
};
use serde::{Deserialize, Serialize};

use super::SpeechmaticsAdapter;
use crate::adapter::http::ensure_success;
use crate::adapter::{BatchFuture, BatchSttAdapter, ClientWithMiddleware};
use crate::error::Error;
use crate::polling::{PollingConfig, PollingResult, poll_until};

impl BatchSttAdapter for SpeechmaticsAdapter {
    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        SpeechmaticsAdapter::is_supported_languages_batch(languages)
    }

    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a ClientWithMiddleware,
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
struct JobConfig {
    #[serde(rename = "type")]
    job_type: String,
    transcription_config: BatchTranscriptionConfig,
}

#[derive(Debug, Serialize)]
struct BatchTranscriptionConfig {
    language: String,
    operating_point: String,
    diarization: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    additional_vocab: Option<Vec<BatchAdditionalVocab>>,
}

#[derive(Debug, Serialize)]
struct BatchAdditionalVocab {
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    sounds_like: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CreateJobResponse {
    id: String,
}

#[derive(Debug, Deserialize)]
struct JobStatusResponse {
    job: JobDetails,
}

#[derive(Debug, Deserialize)]
struct JobDetails {
    id: String,
    status: String,
    #[serde(default)]
    errors: Option<Vec<JobError>>,
}

#[derive(Debug, Deserialize)]
struct JobError {
    #[serde(default)]
    message: String,
}

#[derive(Debug, Deserialize)]
struct TranscriptResponse {
    #[serde(default)]
    results: Vec<TranscriptResult>,
    #[serde(default)]
    metadata: TranscriptMetadata,
}

#[derive(Debug, Default, Deserialize)]
struct TranscriptMetadata {
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
    speaker: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TranscriptAlternative {
    #[serde(default)]
    content: String,
    #[serde(default)]
    confidence: f64,
    #[serde(default)]
    speaker: Option<String>,
}

impl SpeechmaticsAdapter {
    async fn do_transcribe_file(
        client: &ClientWithMiddleware,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_path: PathBuf,
    ) -> Result<BatchResponse, Error> {
        let base_url = Self::batch_api_url(api_base);

        let audio_data = tokio::fs::read(&file_path)
            .await
            .map_err(|e| Error::AudioProcessing(format!("failed to read file: {}", e)))?;

        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("audio.wav")
            .to_string();

        let language = params
            .languages
            .first()
            .map(|l| l.iso639().code().to_string())
            .unwrap_or_else(|| "en".to_string());

        let additional_vocab: Vec<BatchAdditionalVocab> = params
            .keywords
            .iter()
            .map(|k| BatchAdditionalVocab {
                content: k.clone(),
                sounds_like: None,
            })
            .collect();

        let default = crate::providers::Provider::Speechmatics.default_batch_model();
        let operating_point = match params.model.as_deref() {
            Some(m) if crate::providers::is_meta_model(m) => default,
            Some(m) => m,
            None => default,
        };

        let config = JobConfig {
            job_type: "transcription".to_string(),
            transcription_config: BatchTranscriptionConfig {
                language,
                operating_point: operating_point.to_string(),
                diarization: "speaker".to_string(),
                additional_vocab: if additional_vocab.is_empty() {
                    None
                } else {
                    Some(additional_vocab)
                },
            },
        };

        let config_json = serde_json::to_string(&config)
            .map_err(|e| Error::AudioProcessing(format!("failed to serialize config: {}", e)))?;

        let file_part = reqwest::multipart::Part::bytes(audio_data).file_name(file_name);
        let config_part = reqwest::multipart::Part::text(config_json);
        let form = reqwest::multipart::Form::new()
            .part("data_file", file_part)
            .part("config", config_part);

        let create_url = format!("{}/jobs", base_url);
        let create_response = client
            .post(&create_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .multipart(form)
            .send()
            .await?;

        let create_response = ensure_success(create_response).await?;
        let create_result: CreateJobResponse = create_response.json().await?;
        let job_id = create_result.id;

        tracing::info!(job_id = %job_id, "speechmatics job created, polling for completion");

        let poll_url = format!("{}/jobs/{}", base_url, job_id);
        let transcript_url = format!("{}/jobs/{}/transcript?format=json-v2", base_url, job_id);
        let delete_url = format!("{}/jobs/{}", base_url, job_id);

        let config = PollingConfig::default()
            .with_interval(Duration::from_secs(3))
            .with_timeout_error("transcription timed out".to_string());

        let poll_result = poll_until(
            || async {
                let poll_response = client
                    .get(&poll_url)
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await?;

                let poll_response = ensure_success(poll_response).await?;
                let result: JobStatusResponse = poll_response.json().await?;

                match result.job.status.as_str() {
                    "done" => Ok(PollingResult::Complete(())),
                    "rejected" | "deleted" => {
                        let error_msg = result
                            .job
                            .errors
                            .and_then(|e| e.first().map(|err| err.message.clone()))
                            .unwrap_or_else(|| "job failed".to_string());
                        Ok(PollingResult::Failed(format!(
                            "transcription failed: {}",
                            error_msg
                        )))
                    }
                    "running" | "accepted" => Ok(PollingResult::Continue),
                    unknown => Ok(PollingResult::Failed(format!(
                        "unexpected job status: {}",
                        unknown
                    ))),
                }
            },
            config,
        )
        .await;

        let result = match poll_result {
            Ok(()) => {
                let transcript_response = client
                    .get(&transcript_url)
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await?;

                let transcript_response = ensure_success(transcript_response).await?;
                let transcript: TranscriptResponse = transcript_response.json().await?;
                Ok(Self::convert_to_batch_response(transcript))
            }
            Err(e) => Err(e),
        };

        let _ = client
            .delete(&delete_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await;

        result
    }

    fn convert_to_batch_response(response: TranscriptResponse) -> BatchResponse {
        let mut words: Vec<BatchWord> = Vec::new();
        let mut transcript = String::new();

        for result in &response.results {
            if result.result_type == "word" {
                if let Some(alt) = result.alternatives.first() {
                    let speaker = result
                        .speaker
                        .as_ref()
                        .or(alt.speaker.as_ref())
                        .and_then(|s| {
                            s.trim_start_matches(|c: char| !c.is_ascii_digit())
                                .parse::<usize>()
                                .ok()
                        });

                    words.push(BatchWord {
                        word: alt.content.clone(),
                        start: result.start_time,
                        end: result.end_time,
                        confidence: alt.confidence,
                        speaker,
                        punctuated_word: Some(alt.content.clone()),
                    });

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
        }

        if transcript.is_empty() && !response.metadata.transcript.is_empty() {
            transcript = response.metadata.transcript;
        }

        let channel = BatchChannel {
            alternatives: vec![BatchAlternatives {
                transcript,
                confidence: 1.0,
                words,
            }],
        };

        BatchResponse {
            metadata: serde_json::json!({}),
            results: BatchResults {
                channels: vec![channel],
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http_client::create_client;

    #[tokio::test]
    #[ignore]
    async fn test_speechmatics_batch_transcription() {
        let api_key = std::env::var("SPEECHMATICS_API_KEY").expect("SPEECHMATICS_API_KEY not set");
        let client = create_client();
        let adapter = SpeechmaticsAdapter::default();
        let params = ListenParams::default();

        let audio_path = std::path::PathBuf::from(hypr_data::english_1::AUDIO_PATH);

        let result = adapter
            .transcribe_file(&client, "", &api_key, &params, &audio_path)
            .await
            .expect("transcription failed");

        assert!(!result.results.channels.is_empty());
        assert!(!result.results.channels[0].alternatives.is_empty());
        assert!(
            !result.results.channels[0].alternatives[0]
                .transcript
                .is_empty()
        );
        assert!(!result.results.channels[0].alternatives[0].words.is_empty());
    }
}
