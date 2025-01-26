use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct TranscribeInputChunk {
    #[serde(with = "serde_bytes")]
    pub audio: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct TranscribeOutputChunk {
    pub text: String,
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

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("connection error")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("reqwest error")]
    Reqwest(#[from] reqwest::Error),
}
