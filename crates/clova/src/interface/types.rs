use serde::de::Error as _;
use serde::{Deserialize, Serialize};

// https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-grpc#3-request-config-json
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcription: Option<Transcription>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keyword_boosting: Option<KeywordBoosting>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Transcription {
    pub language: Language,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct KeywordBoosting {
    pub boostings: Vec<KeywordBoostingItem>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct KeywordBoostingItem {
    pub words: String,
    pub weight: f64,
}

impl From<Vec<String>> for KeywordBoosting {
    fn from(value: Vec<String>) -> Self {
        Self {
            boostings: value
                .into_iter()
                .map(|words| KeywordBoostingItem { words, weight: 1.0 })
                .collect(),
        }
    }
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
    pub uid: String,
    pub config: ConfigResponseInner,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConfigResponseInner {
    pub status: String,
}

// https://api.ncloud-docs.com/docs/ai-application-service-clovaspeech-grpc#%EC%9D%91%EB%8B%B5-%EC%98%88%EC%8B%9C1
#[derive(Debug, Deserialize, Serialize)]
#[serde(try_from = "StreamResponseRaw")]
pub enum StreamResponse {
    Config(ConfigResponse),
    TranscribeSuccess(StreamResponseSuccess),
    TranscribeFailure(StreamResponseFailure),
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
        let response_type = raw
            .response_type
            .first()
            .ok_or_else(|| serde_json::Error::custom("missing response_type"))?;

        match response_type.as_str() {
            "config" => serde_json::from_value(raw.raw).map(StreamResponse::Config),
            "recognize" => serde_json::from_value(raw.raw).map(StreamResponse::TranscribeFailure),
            "transcription" => {
                serde_json::from_value(raw.raw).map(StreamResponse::TranscribeSuccess)
            }
            _ => Err(serde_json::Error::custom("invalid response_type")),
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
    pub start_timestamp: u64,
    pub end_timestamp: u64,
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
}
