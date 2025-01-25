// https://api.ncloud-docs.com/docs/en/ai-application-service-clovaspeech-longsentence-externalurl

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Language {
    #[serde(rename = "ko-KR")]
    Korean,
    #[serde(rename = "en-US")]
    English,
    #[serde(rename = "enko")]
    KoreanWithEnglish,
    #[serde(rename = "ja")]
    Japanese,
    #[serde(rename = "zh-tw")]
    ChineseTraditional,
    #[serde(rename = "zh-cn")]
    ChineseSimplified,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Completion {
    #[serde(rename = "sync")]
    Sync,
    #[serde(rename = "async")]
    Async,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Segment {
    pub start: u64,
    pub end: u64,
    pub text: String,
}
