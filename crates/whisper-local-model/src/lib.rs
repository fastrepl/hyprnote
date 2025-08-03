#[derive(
    Debug,
    Eq,
    Hash,
    PartialEq,
    Clone,
    clap::ValueEnum,
    strum::EnumString,
    strum::Display,
    serde::Serialize,
    serde::Deserialize,
    specta::Type,
)]
pub enum WhisperModel {
    QuantizedTiny,
    QuantizedTinyEn,
    QuantizedBase,
    QuantizedBaseEn,
    QuantizedSmall,
    QuantizedSmallEn,
    QuantizedLargeTurbo,
}

impl WhisperModel {
    pub fn file_name(&self) -> &str {
        match self {
            WhisperModel::QuantizedTiny => "ggml-tiny-q8_0.bin",
            WhisperModel::QuantizedTinyEn => "ggml-tiny.en-q8_0.bin",
            WhisperModel::QuantizedBase => "ggml-base-q8_0.bin",
            WhisperModel::QuantizedBaseEn => "ggml-base.en-q8_0.bin",
            WhisperModel::QuantizedSmall => "ggml-small-q8_0.bin",
            WhisperModel::QuantizedSmallEn => "ggml-small.en-q8_0.bin",
            WhisperModel::QuantizedLargeTurbo => "ggml-large-v3-turbo-q8_0.bin",
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            WhisperModel::QuantizedTiny => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny-q8_0.bin"
            }
            WhisperModel::QuantizedTinyEn => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny.en-q8_0.bin"
            }
            WhisperModel::QuantizedBase => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-base-q8_0.bin"
            }
            WhisperModel::QuantizedBaseEn => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-base.en-q8_0.bin"
            }
            WhisperModel::QuantizedSmall => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-small-q8_0.bin"
            }
            WhisperModel::QuantizedSmallEn => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-small.en-q8_0.bin"
            }
            WhisperModel::QuantizedLargeTurbo => {
                "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-large-v3-turbo-q8_0.bin"
        }
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            WhisperModel::QuantizedTiny => 43537433,
            WhisperModel::QuantizedTinyEn => 43550795,
            WhisperModel::QuantizedBase => 81768585,
            WhisperModel::QuantizedBaseEn => 81781811,
            WhisperModel::QuantizedSmall => 264464607,
            WhisperModel::QuantizedSmallEn => 264477561,
            WhisperModel::QuantizedLargeTurbo => 874188075,
        }
    }
}
