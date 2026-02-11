use serde::{Deserialize, Serialize};

const SONIOX_API_HOST: &str = "https://api.soniox.com";

#[derive(Debug)]
pub struct SonioxError {
    pub message: String,
    pub is_retryable: bool,
}

impl std::fmt::Display for SonioxError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for SonioxError {}

fn is_retryable_status(status: u16) -> bool {
    matches!(status, 429 | 500..)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SonioxCallback {
    pub id: String,
    pub status: String,
}

#[derive(Deserialize)]
struct SonioxTranscriptResponse {
    text: String,
    #[serde(default)]
    tokens: Vec<SonioxToken>,
}

#[derive(Deserialize)]
struct SonioxToken {
    text: String,
}

#[derive(Deserialize)]
struct CreateTranscriptionResponse {
    id: String,
}

pub async fn transcribe_with_callback(
    client: &reqwest::Client,
    audio_url: &str,
    callback_url: &str,
    api_key: &str,
) -> Result<String, SonioxError> {
    let response = client
        .post(format!("{SONIOX_API_HOST}/v1/transcriptions"))
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&serde_json::json!({
            "model": "stt-async-v3",
            "audio_url": audio_url,
            "webhook_url": callback_url,
            "enable_speaker_diarization": true,
            "enable_language_identification": true,
        }))
        .send()
        .await
        .map_err(|e| SonioxError {
            message: format!("Soniox request failed: {e}"),
            is_retryable: true,
        })?;

    let status = response.status().as_u16();
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(SonioxError {
            message: format!("Soniox: {status} - {error_text}"),
            is_retryable: is_retryable_status(status),
        });
    }

    let result: CreateTranscriptionResponse = response.json().await.map_err(|e| SonioxError {
        message: format!("Soniox: failed to parse response: {e}"),
        is_retryable: false,
    })?;

    if result.id.is_empty() {
        return Err(SonioxError {
            message: "Soniox: missing transcription id".to_string(),
            is_retryable: false,
        });
    }

    Ok(result.id)
}

pub async fn fetch_transcript(
    client: &reqwest::Client,
    transcription_id: &str,
    api_key: &str,
) -> Result<String, SonioxError> {
    let response = client
        .get(format!(
            "{SONIOX_API_HOST}/v1/transcriptions/{transcription_id}/transcript"
        ))
        .header("Authorization", format!("Bearer {api_key}"))
        .send()
        .await
        .map_err(|e| SonioxError {
            message: format!("Soniox fetch transcript failed: {e}"),
            is_retryable: true,
        })?;

    let status = response.status().as_u16();
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(SonioxError {
            message: format!("Soniox fetch transcript: {status} - {error_text}"),
            is_retryable: is_retryable_status(status),
        });
    }

    let result: SonioxTranscriptResponse = response.json().await.map_err(|e| SonioxError {
        message: format!("Soniox: failed to parse transcript response: {e}"),
        is_retryable: false,
    })?;

    if result.text.is_empty() {
        Ok(render_tokens(&result.tokens))
    } else {
        Ok(result.text)
    }
}

fn render_tokens(tokens: &[SonioxToken]) -> String {
    tokens.iter().map(|t| t.text.as_str()).collect()
}
