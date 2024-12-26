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

#[derive(Debug, Deserialize, Serialize)]
pub enum ConfigResponseStatus {
    Success,
    Failure,
}

mod nest {
    include!("./com.nbp.cdncp.nest.grpc.proto.v1.rs");
}

pub use nest::*;
