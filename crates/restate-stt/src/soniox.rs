use serde::{Deserialize, Serialize};

pub use soniox::CallbackPayload as SonioxCallback;
pub use soniox::Error as SonioxError;

#[derive(Serialize, Deserialize)]
pub struct TranscriptResult {
    pub text: String,
    pub tokens: Vec<hypr_restate_stt_types::TranscriptToken>,
}

pub async fn transcribe_with_callback(
    client: &reqwest::Client,
    audio_url: &str,
    callback_url: &str,
    api_key: &str,
) -> Result<String, SonioxError> {
    soniox::create_transcription(
        client,
        &serde_json::json!({
            "model": "stt-async-v3",
            "audio_url": audio_url,
            "webhook_url": callback_url,
            "enable_speaker_diarization": true,
            "enable_language_identification": true,
        }),
        api_key,
    )
    .await
}

pub async fn fetch_transcript(
    client: &reqwest::Client,
    transcription_id: &str,
    api_key: &str,
) -> Result<TranscriptResult, SonioxError> {
    let result = soniox::fetch_transcript(client, transcription_id, api_key).await?;

    let text = if result.text.is_empty() {
        result.tokens.iter().map(|t| t.text.as_str()).collect()
    } else {
        result.text
    };

    let tokens = result
        .tokens
        .into_iter()
        .map(|t| hypr_restate_stt_types::TranscriptToken {
            text: t.text,
            start_ms: t.start_ms.unwrap_or(0),
            end_ms: t.end_ms.unwrap_or(0),
            speaker: t.speaker.and_then(|s| s.as_u32()),
        })
        .collect();

    Ok(TranscriptResult { text, tokens })
}
