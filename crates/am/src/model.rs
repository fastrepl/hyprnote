#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum Model {
    ParakeetV2,
    WhisperLargeV3,
    WhisperSmallEn,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ModelInfo {
    pub key: String,
    pub name: String,
    pub size_bytes: u64,
}

impl Model {
    pub fn info(&self) -> ModelInfo {
        ModelInfo {
            key: self.model_key().to_string(),
            name: self.display_name().to_string(),
            size_bytes: self.model_size(),
        }
    }

    pub fn repo_name(&self) -> &str {
        match self {
            Model::ParakeetV2 => "argmaxinc/parakeetkit-pro",
            Model::WhisperLargeV3 => "argmaxinc/whisperkit-pro",
            Model::WhisperSmallEn => "argmaxinc/whisperkit-pro",
        }
    }
    pub fn model_key(&self) -> &str {
        match self {
            Model::ParakeetV2 => "parakeet-v2_476MB",
            Model::WhisperLargeV3 => "large-v3-v20240930_626MB",
            Model::WhisperSmallEn => "small.en_217MB",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            Model::ParakeetV2 => "Parakeet V2 (English)",
            Model::WhisperLargeV3 => "Whisper Large V3 (English)",
            Model::WhisperSmallEn => "Whisper Small (English)",
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            Model::ParakeetV2 => 476 * 1024 * 1024,
            Model::WhisperLargeV3 => 626 * 1024 * 1024,
            Model::WhisperSmallEn => 217 * 1024 * 1024,
        }
    }
}
