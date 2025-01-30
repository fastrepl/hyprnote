use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub enum ListenOutputChunk {
    Transcribe(TranscribeOutputChunk),
    Diarize(DiarizeOutputChunk),
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct ListenInputChunk {
    #[serde(with = "serde_bytes")]
    pub audio: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct DiarizeInputChunk {
    #[serde(with = "serde_bytes")]
    pub audio: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct DiarizeOutputChunk {
    pub speaker: String,
    pub start: f32,
    pub end: f32,
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct TranscribeInputChunk {
    #[serde(with = "serde_bytes")]
    pub audio: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct TranscribeOutputChunk {
    pub start: f32,
    pub end: f32,
    pub text: String,
}

impl From<hypr_stt::realtime::StreamResponse> for TranscribeOutputChunk {
    fn from(value: hypr_stt::realtime::StreamResponse) -> Self {
        Self {
            start: value.start as f32,
            end: value.end as f32,
            text: value.text,
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct EnhanceRequest {
    pub pre_meeting_editor: String,
    pub in_meeting_editor: String,
    pub template: hypr_db::user::Template,
    pub config_general: hypr_db::user::ConfigDataGeneral,
    pub config_profile: hypr_db::user::ConfigDataProfile,
    pub event: Option<hypr_db::user::Event>,
    pub participants: Vec<hypr_db::user::Participant>,
    pub transcripts: Vec<hypr_db::user::TranscriptBlock>,
    pub diarizations: Vec<hypr_db::user::DiarizationBlock>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CreateTitleRequest {
    pub transcripts: Vec<hypr_db::user::TranscriptBlock>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CreateTitleResponse {
    pub title: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PostprocessEnhanceRequest {
    pub editor: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PostprocessEnhanceResponse {
    pub editor: String,
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("connection error")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("reqwest error")]
    Reqwest(#[from] reqwest::Error),
}
