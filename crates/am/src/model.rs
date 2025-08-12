#[derive(
    Debug,
    Clone,
    serde::Serialize,
    serde::Deserialize,
    specta::Type,
    strum::Display,
    Eq,
    Hash,
    PartialEq,
)]
pub enum AmModel {
    #[serde(rename = "am-parakeet-v2")]
    #[strum(serialize = "am-parakeet-v2")]
    ParakeetV2,
    #[serde(rename = "am-whisper-large-v3")]
    #[strum(serialize = "am-whisper-large-v3")]
    WhisperLargeV3,
    #[serde(rename = "am-whisper-small-en")]
    #[strum(serialize = "am-whisper-small-en")]
    WhisperSmallEn,
}

impl AmModel {
    pub fn repo_name(&self) -> &str {
        match self {
            AmModel::ParakeetV2 => "argmaxinc/parakeetkit-pro",
            AmModel::WhisperLargeV3 => "argmaxinc/whisperkit-pro",
            AmModel::WhisperSmallEn => "argmaxinc/whisperkit-pro",
        }
    }

    pub fn model_dir(&self) -> &str {
        match self {
            AmModel::ParakeetV2 => "nvidia_parakeet-v2_476MB",
            AmModel::WhisperLargeV3 => "openai_whisper-large-v3-v20240930_626MB",
            AmModel::WhisperSmallEn => "openai_whisper-small.en_217MB",
        }
    }

    pub fn model_key(&self) -> &str {
        match self {
            AmModel::ParakeetV2 => "parakeet-v2_476MB",
            AmModel::WhisperLargeV3 => "large-v3-v20240930_626MB",
            AmModel::WhisperSmallEn => "small.en_217MB",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            AmModel::ParakeetV2 => "Parakeet V2 (English)",
            AmModel::WhisperLargeV3 => "Whisper Large V3 (English)",
            AmModel::WhisperSmallEn => "Whisper Small (English)",
        }
    }

    pub fn model_size_bytes(&self) -> u64 {
        match self {
            AmModel::ParakeetV2 => 476 * 1024 * 1024,
            AmModel::WhisperLargeV3 => 626 * 1024 * 1024,
            AmModel::WhisperSmallEn => 217 * 1024 * 1024,
        }
    }
}
