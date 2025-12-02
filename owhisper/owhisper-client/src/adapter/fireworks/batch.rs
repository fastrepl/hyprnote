use std::path::Path;

use owhisper_interface::batch::{
    Alternatives as BatchAlternatives, Channel as BatchChannel, Response as BatchResponse,
    Results as BatchResults,
};
use owhisper_interface::ListenParams;
use serde::Deserialize;

use super::FireworksAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter};
use crate::error::Error;

// https://docs.fireworks.ai/api-reference/audio-transcriptions
impl BatchSttAdapter for FireworksAdapter {
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

impl FireworksAdapter {
    async fn do_transcribe_file(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_path: &Path,
    ) -> Result<BatchResponse, Error> {
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

        let file_part = reqwest::multipart::Part::bytes(file_bytes).file_name(file_name);
        let mut form = reqwest::multipart::Form::new().part("file", file_part);

        let model = params.model.as_deref().unwrap_or("whisper-v3-turbo");
        form = form.text("model", model.to_string());

        if let Some(lang) = params.languages.first() {
            form = form.text("language", lang.iso639().code().to_string());
        }

        form = form.text("response_format", "verbose_json");
        form = form.text("timestamp_granularities", "word");

        let url = format!(
            "https://{}/v1/audio/transcriptions",
            Self::batch_api_host(api_base)
        );

        let response = client
            .post(&url)
            .header("Authorization", api_key)
            .multipart(form)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(Error::UnexpectedStatus { status, body });
        }

        let fireworks_response: FireworksBatchResponse = response.json().await?;

        let words = fireworks_response
            .words
            .unwrap_or_default()
            .into_iter()
            .map(|w| owhisper_interface::batch::Word {
                word: w.word.clone(),
                start: w.start,
                end: w.end,
                confidence: 1.0,
                speaker: None,
                punctuated_word: Some(w.word),
            })
            .collect();

        let alternatives = BatchAlternatives {
            transcript: fireworks_response.text,
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
}

#[derive(Debug, Deserialize)]
struct FireworksBatchResponse {
    text: String,
    #[serde(default)]
    words: Option<Vec<FireworksBatchWord>>,
}

#[derive(Debug, Deserialize)]
struct FireworksBatchWord {
    word: String,
    start: f64,
    end: f64,
}
