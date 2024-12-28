use serde::de::Error as _;
use serde::{Deserialize, Serialize};

// https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-grpc#3-request-config-json
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ConfigRequest {
    pub transcription: Transcription,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Transcription {
    pub language: Language,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum Language {
    #[serde(rename = "ko")]
    Korean,
    #[serde(rename = "ja")]
    Japanese,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConfigResponse {
    pub config: ConfigResponseInner,
    pub uid: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConfigResponseInner {
    pub status: String,
    #[serde(rename = "contextCode")]
    pub context_code: ContextCode,
    pub transcription: TranscriptionStatus,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ContextCode {
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TranscriptionStatus {
    pub status: String,
}

// https://api.ncloud-docs.com/docs/ai-application-service-clovaspeech-grpc#%EC%9D%91%EB%8B%B5-%EC%98%88%EC%8B%9C1
#[derive(Debug, Deserialize, Serialize)]
#[serde(try_from = "StreamResponseRaw")]
pub enum StreamResponse {
    Config(ConfigResponse),
    AudioSuccess(StreamResponseSuccess),
    AudioFailure(StreamResponseFailure),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StreamResponseRaw {
    response_type: Vec<String>,
    #[serde(flatten)]
    raw: serde_json::Value,
}

impl TryFrom<StreamResponseRaw> for StreamResponse {
    type Error = serde_json::Error;

    fn try_from(raw: StreamResponseRaw) -> Result<Self, Self::Error> {
        match raw.response_type.first().map(String::as_str) {
            Some("config") => serde_json::from_value(raw.raw).map(StreamResponse::Config),
            Some("transcription") => {
                serde_json::from_value(raw.raw).map(StreamResponse::AudioSuccess)
            }
            Some("error") => serde_json::from_value(raw.raw).map(StreamResponse::AudioFailure),
            _ => Err(serde_json::Error::custom(
                "invalid or missing response_type",
            )),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StreamResponseSuccess {
    pub uid: String,
    pub transcription: TranscriptionResponse,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionResponse {
    pub text: String,
    pub position: i32,
    pub period_positions: Vec<i32>,
    pub period_align_indices: Vec<i32>,
    pub ep_flag: bool,
    pub seq_id: i32,
    pub epd_type: EpdType,
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    pub confidence: f64,
    pub align_infos: Vec<AlignInfo>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AlignInfo {
    pub word: String,
    pub start: i64,
    pub end: i64,
    pub confidence: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StreamResponseFailure {
    pub uid: String,
    pub recognize: RecognizeError,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RecognizeError {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ep_flag: Option<StatusInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seq_id: Option<StatusInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio: Option<StatusInfo>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StatusInfo {
    pub status: String,
}

mod nest {
    include!("./com.nbp.cdncp.nest.grpc.proto.v1.rs");
}

pub use nest::*;

#[derive(Debug, Deserialize, Serialize)]
pub enum EpdType {
    #[serde(rename = "gap")]
    Gap,
    #[serde(rename = "endPoint")]
    EndPoint,
    #[serde(rename = "durationThreshold")]
    DurationThreshold,
    #[serde(rename = "period")]
    Period,
    #[serde(rename = "syllableThreshold")]
    SyllableThreshold,
    #[serde(rename = "unvoice")]
    Unvoice,
}
