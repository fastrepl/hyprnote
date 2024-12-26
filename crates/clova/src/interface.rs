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
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConfigResponseInner {
    pub status: ConfigResponseStatus,
}

#[derive(Debug, PartialEq, Deserialize, Serialize)]
pub enum ConfigResponseStatus {
    Success,
    Failure,
}

// https://api.ncloud-docs.com/docs/ai-application-service-clovaspeech-grpc#%EC%9D%91%EB%8B%B5-%EC%98%88%EC%8B%9C1
#[derive(Debug, Deserialize, Serialize)]
pub enum StreamResponse {
    Success(StreamResponseSuccess),
    Failure(StreamResponseFailure),
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StreamResponseSuccess {
    pub uid: String,
    pub response_type: Vec<String>,
    pub transcription: TranscriptionResponse,
}

#[derive(Debug, Deserialize, Serialize)]
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
    pub response_type: Vec<String>,
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
