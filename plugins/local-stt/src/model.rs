pub static SUPPORTED_MODELS: &[SupportedModel] = &[
    SupportedModel::QuantizedTinyEn,
    SupportedModel::QuantizedBaseEn,
    SupportedModel::QuantizedSmallEn,
];

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum SupportedModel {
    QuantizedTinyEn,
    QuantizedBaseEn,
    QuantizedSmallEn,
}

impl SupportedModel {
    pub fn model_path(&self, data_dir: impl Into<std::path::PathBuf>) -> std::path::PathBuf {
        match self {
            SupportedModel::QuantizedTinyEn => data_dir.into().join("ggml-tiny.en-q8_0.bin"),
            SupportedModel::QuantizedBaseEn => data_dir.into().join("ggml-base.en-q8_0.bin"),
            SupportedModel::QuantizedSmallEn => data_dir.into().join("ggml-small.en-q8_0.bin"),
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::QuantizedTinyEn => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/ggerganov/whisper.cpp/main/ggml-tiny.en-q8_0.bin",
            SupportedModel::QuantizedBaseEn => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/ggerganov/whisper.cpp/main/ggml-base.en-q8_0.bin",
            SupportedModel::QuantizedSmallEn => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/ggerganov/whisper.cpp/main/ggml-small.en-q8_0.bin",
        }
    }

    pub fn model_size(&self) -> u32 {
        match self {
            SupportedModel::QuantizedTinyEn => 43550795,
            SupportedModel::QuantizedBaseEn => 81781811,
            SupportedModel::QuantizedSmallEn => 264477561,
        }
    }

    pub fn model_checksum(&self) -> u32 {
        match self {
            SupportedModel::QuantizedTinyEn => 230334082,
            SupportedModel::QuantizedBaseEn => 2554759952,
            SupportedModel::QuantizedSmallEn => 3958576310,
        }
    }
}
