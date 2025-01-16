use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct TranscribeInputChunk {
    pub audio: Vec<f32>,
}

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct TranscribeOutputChunk {
    pub text: String,
}
