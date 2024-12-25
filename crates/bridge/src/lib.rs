use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct TranscribeInputChunk {}

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct TranscribeOutputChunk {}

#[derive(Debug, Deserialize, Serialize)]
pub struct EnhanceInput {
    pub text: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EnhanceOutputChunk {}
