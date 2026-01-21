use std::path::{Path, PathBuf};

use owhisper_interface::ListenParams;
use owhisper_interface::batch::{Alternatives, Channel, Response as BatchResponse, Results, Word};
use reqwest::multipart::{Form, Part};

use crate::adapter::{BatchFuture, BatchSttAdapter, ClientWithMiddleware};
use crate::error::Error;

use super::VoxtralAdapter;

use crate::providers::{Provider, is_meta_model};

const DEFAULT_API_BASE: &str = "https://api.mistral.ai/v1";

impl BatchSttAdapter for VoxtralAdapter {
    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> bool {
        VoxtralAdapter::is_supported_languages_batch(languages)
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
        Box::pin(do_transcribe_file(client, api_base, api_key, params, path))
    }
}

#[derive(Debug, serde::Deserialize)]
struct VoxtralSegment {
    #[allow(dead_code)]
    id: Option<i32>,
    text: String,
    start: f64,
    end: f64,
}

#[derive(Debug, serde::Deserialize)]
struct VoxtralResponse {
    #[allow(dead_code)]
    model: Option<String>,
    language: Option<String>,
    text: String,
    #[serde(default)]
    segments: Vec<VoxtralSegment>,
}

async fn do_transcribe_file(
    client: &ClientWithMiddleware,
    api_base: &str,
    api_key: &str,
    params: &ListenParams,
    file_path: PathBuf,
) -> Result<BatchResponse, Error> {
    let fallback_name = match file_path.extension().and_then(|e| e.to_str()) {
        Some(ext) => format!("audio.{}", ext),
        None => "audio".to_string(),
    };

    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .map(ToOwned::to_owned)
        .unwrap_or(fallback_name);

    let file_bytes = tokio::fs::read(&file_path)
        .await
        .map_err(|e| Error::AudioProcessing(e.to_string()))?;

    let mime_type = mime_type_from_extension(&file_path);

    let file_part = Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str(mime_type)
        .map_err(|e| Error::AudioProcessing(e.to_string()))?;

    let default = Provider::Voxtral.default_batch_model();
    let model = match params.model.as_deref() {
        Some(m) if is_meta_model(m) => default,
        Some(m) => m,
        None => default,
    };

    let mut form = Form::new()
        .part("file", file_part)
        .text("model", model.to_string())
        .text("timestamp_granularities[]", "segment");

    if let Some(lang) = params.languages.first() {
        form = form.text("language", lang.iso639().code().to_string());
    }

    let base = if api_base.is_empty() {
        DEFAULT_API_BASE
    } else {
        api_base.trim_end_matches('/')
    };
    let url = format!("{}/audio/transcriptions", base);

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;

    let status = response.status();
    if status.is_success() {
        let voxtral_response: VoxtralResponse = response.json().await?;
        Ok(convert_response(voxtral_response))
    } else {
        Err(Error::UnexpectedStatus {
            status,
            body: response.text().await.unwrap_or_default(),
        })
    }
}

fn mime_type_from_extension(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("mp3") => "audio/mpeg",
        Some("mp4") => "audio/mp4",
        Some("m4a") => "audio/mp4",
        Some("wav") => "audio/wav",
        Some("webm") => "audio/webm",
        Some("ogg") => "audio/ogg",
        Some("flac") => "audio/flac",
        _ => "application/octet-stream",
    }
}

fn convert_response(response: VoxtralResponse) -> BatchResponse {
    let words: Vec<Word> = if !response.segments.is_empty() {
        response
            .segments
            .into_iter()
            .flat_map(|segment| {
                let segment_duration = segment.end - segment.start;
                let segment_words: Vec<&str> = segment.text.split_whitespace().collect();
                let word_count = segment_words.len();

                if word_count == 0 {
                    return vec![];
                }

                let word_duration = segment_duration / word_count as f64;

                segment_words
                    .into_iter()
                    .enumerate()
                    .map(|(i, word)| {
                        let start = segment.start + (i as f64 * word_duration);
                        let end = start + word_duration;
                        Word {
                            word: word.to_string(),
                            start,
                            end,
                            confidence: 1.0,
                            speaker: None,
                            punctuated_word: Some(word.to_string()),
                        }
                    })
                    .collect::<Vec<_>>()
            })
            .collect()
    } else {
        Vec::new()
    };

    let alternatives = Alternatives {
        transcript: response.text.trim().to_string(),
        confidence: 1.0,
        words,
    };

    let channel = Channel {
        alternatives: vec![alternatives],
    };

    let metadata = serde_json::json!({
        "language": response.language,
    });

    BatchResponse {
        metadata,
        results: Results {
            channels: vec![channel],
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapter::BatchSttAdapter;
    use crate::http_client::create_client;

    #[tokio::test]
    #[ignore]
    async fn test_voxtral_transcribe() {
        let api_key = std::env::var("MISTRAL_API_KEY").expect("MISTRAL_API_KEY not set");

        let adapter = VoxtralAdapter::default();
        let client = create_client();
        let api_base = "https://api.mistral.ai/v1";

        let params = ListenParams::default();

        let audio_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../crates/data/src/english_1/audio.wav");

        let result = adapter
            .transcribe_file(&client, api_base, &api_key, &params, &audio_path)
            .await;

        let response = result.expect("transcription should succeed");

        assert!(!response.results.channels.is_empty());
        let channel = &response.results.channels[0];
        assert!(!channel.alternatives.is_empty());
        let alt = &channel.alternatives[0];
        assert!(!alt.transcript.is_empty());
        println!("Transcript: {}", alt.transcript);
        println!("Word count: {}", alt.words.len());
    }
}
