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
    pub user: hypr_db::user::ConfigDataProfile,
    pub editor: String,
    pub transcript: hypr_db::user::Transcript,
    pub template: hypr_db::user::Template,
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
