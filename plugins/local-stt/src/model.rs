pub static SUPPORTED_MODELS: &[SupportedModel] = &[
    SupportedModel::QuantizedTiny,
    SupportedModel::QuantizedTinyEn,
    SupportedModel::QuantizedBase,
    SupportedModel::QuantizedBaseEn,
    SupportedModel::QuantizedSmall,
    SupportedModel::QuantizedSmallEn,
    SupportedModel::QuantizedLargeTurbo,
];

#[derive(Debug, Eq, Hash, PartialEq, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum SupportedModel {
    QuantizedTiny,
    QuantizedTinyEn,
    QuantizedBase,
    QuantizedBaseEn,
    QuantizedSmall,
    QuantizedSmallEn,
    QuantizedLargeTurbo,
}

impl SupportedModel {
    pub fn model_path(&self, data_dir: impl Into<std::path::PathBuf>) -> std::path::PathBuf {
        match self {
            SupportedModel::QuantizedTiny => data_dir.into().join("ggml-tiny-q8_0.bin"),
            SupportedModel::QuantizedTinyEn => data_dir.into().join("ggml-tiny.en-q8_0.bin"),
            SupportedModel::QuantizedBase => data_dir.into().join("ggml-base-q8_0.bin"),
            SupportedModel::QuantizedBaseEn => data_dir.into().join("ggml-base.en-q8_0.bin"),
            SupportedModel::QuantizedSmall => data_dir.into().join("ggml-small-q8_0.bin"),
            SupportedModel::QuantizedSmallEn => data_dir.into().join("ggml-small.en-q8_0.bin"),
            SupportedModel::QuantizedLargeTurbo => {
                data_dir.into().join("ggml-large-v3-turbo-q8_0.bin")
            }
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::QuantizedTiny => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny-q8_0.bin",
            SupportedModel::QuantizedTinyEn => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny.en-q8_0.bin",
            SupportedModel::QuantizedBase => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-base-q8_0.bin",
            SupportedModel::QuantizedBaseEn => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-base.en-q8_0.bin",
            SupportedModel::QuantizedSmall => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-small-q8_0.bin",
            SupportedModel::QuantizedSmallEn => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-small.en-q8_0.bin",
            SupportedModel::QuantizedLargeTurbo => "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-large-v3-turbo-q8_0.bin",
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::QuantizedTiny => 43537433,
            SupportedModel::QuantizedTinyEn => 43550795,
            SupportedModel::QuantizedBase => 81768585,
            SupportedModel::QuantizedBaseEn => 81781811,
            SupportedModel::QuantizedSmall => 264464607,
            SupportedModel::QuantizedSmallEn => 264477561,
            SupportedModel::QuantizedLargeTurbo => 874188075,
        }
    }
}
