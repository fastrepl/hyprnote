use std::path::{Path, PathBuf};

use owhisper_interface::batch::{Alternatives, Channel, Response as BatchResponse, Results, Word};
use owhisper_interface::ListenParams;
use reqwest::multipart::{Form, Part};

use crate::adapter::{BatchFuture, BatchSttAdapter};
use crate::error::Error;

use super::OpenAIAdapter;

const DEFAULT_API_BASE: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "whisper-1";

impl BatchSttAdapter for OpenAIAdapter {
    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
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
struct OpenAIWord {
    word: String,
    start: f64,
    end: f64,
}

#[derive(Debug, serde::Deserialize)]
struct OpenAISegment {
    #[allow(dead_code)]
    id: i32,
    #[allow(dead_code)]
    seek: i32,
    start: f64,
    end: f64,
    text: String,
}

#[derive(Debug, serde::Deserialize)]
struct OpenAIVerboseResponse {
    #[allow(dead_code)]
    task: Option<String>,
    language: Option<String>,
    #[allow(dead_code)]
    duration: Option<f64>,
    text: String,
    #[serde(default)]
    words: Vec<OpenAIWord>,
    #[serde(default)]
    segments: Vec<OpenAISegment>,
}

async fn do_transcribe_file(
    client: &reqwest::Client,
    api_base: &str,
    api_key: &str,
    params: &ListenParams,
    file_path: PathBuf,
) -> Result<BatchResponse, Error> {
    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.wav")
        .to_string();

    let file_bytes = tokio::fs::read(&file_path)
        .await
        .map_err(|e| Error::AudioProcessing(e.to_string()))?;

    let mime_type = mime_type_from_extension(&file_path);

    let file_part = Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str(mime_type)
        .map_err(|e| Error::AudioProcessing(e.to_string()))?;

    let model = params.model.as_deref().unwrap_or(DEFAULT_MODEL);

    let mut form = Form::new()
        .part("file", file_part)
        .text("model", model.to_string())
        .text("response_format", "verbose_json")
        .text("timestamp_granularities[]", "word");

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
        let openai_response: OpenAIVerboseResponse = response.json().await?;
        Ok(convert_response(openai_response))
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

fn convert_response(response: OpenAIVerboseResponse) -> BatchResponse {
    let words: Vec<Word> = if !response.words.is_empty() {
        response
            .words
            .into_iter()
            .map(|w| Word {
                word: w.word.clone(),
                start: w.start,
                end: w.end,
                confidence: 1.0,
                speaker: None,
                punctuated_word: Some(w.word),
            })
            .collect()
    } else {
        response
            .segments
            .into_iter()
            .map(|s| Word {
                word: s.text.trim().to_string(),
                start: s.start,
                end: s.end,
                confidence: 1.0,
                speaker: None,
                punctuated_word: Some(s.text.trim().to_string()),
            })
            .collect()
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

    #[tokio::test]
    #[ignore]
    async fn test_openai_transcribe() {
        let api_key = std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY not set");

        let adapter = OpenAIAdapter::default();
        let client = reqwest::Client::new();
        let api_base = "https://api.openai.com/v1";

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
