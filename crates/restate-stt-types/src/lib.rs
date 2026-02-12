use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PipelineStatus {
    Queued,
    Transcribing,
    Done,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[serde(rename_all = "camelCase")]
pub struct TranscriptToken {
    pub text: String,
    pub start_ms: u64,
    pub end_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
#[serde(rename_all = "camelCase")]
pub struct SttStatusResponse {
    pub status: PipelineStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tokens: Option<Vec<TranscriptToken>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
