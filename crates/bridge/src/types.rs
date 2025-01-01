use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct TranscribeInputChunk {}

#[derive(Debug, Deserialize, Serialize, specta::Type)]
pub struct TranscribeOutputChunk {}
