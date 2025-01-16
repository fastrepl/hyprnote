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

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("connection error")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
}
