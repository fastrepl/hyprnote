#[derive(Debug, Clone)]
pub enum SupportedModel {
    QuantizedTiny,
    QuantizedLargeV3Turbo,
}

impl From<rwhisper::WhisperSource> for SupportedModel {
    fn from(source: rwhisper::WhisperSource) -> Self {
        match source {
            rwhisper::WhisperSource::QuantizedTiny => SupportedModel::QuantizedTiny,
            rwhisper::WhisperSource::QuantizedLargeV3Turbo => SupportedModel::QuantizedLargeV3Turbo,
            _ => unreachable!(),
        }
    }
}

impl From<SupportedModel> for rwhisper::WhisperSource {
    fn from(model: SupportedModel) -> Self {
        match model {
            SupportedModel::QuantizedTiny => rwhisper::WhisperSource::QuantizedTiny,
            SupportedModel::QuantizedLargeV3Turbo => rwhisper::WhisperSource::QuantizedLargeV3Turbo,
        }
    }
}

impl SupportedModel {
    pub fn model_path(&self, data_dir: impl Into<std::path::PathBuf>) -> std::path::PathBuf {
        match self {
            SupportedModel::QuantizedTiny => data_dir
                .into()
                .join("lmz/candle-whisper/main/model-tiny-q80.gguf"),
            SupportedModel::QuantizedLargeV3Turbo => data_dir
                .into()
                .join("Demonthos/candle-quantized-whisper-large-v3-turbo/main/model.gguf"),
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::QuantizedTiny => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/lmz/candle-whisper/main/model-tiny-q80.gguf",
            SupportedModel::QuantizedLargeV3Turbo => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/Demonthos/candle-quantized-whisper-large-v3-turbo/main/model.gguf",
        }
    }

    pub fn model_checksum(&self) -> u32 {
        match self {
            SupportedModel::QuantizedTiny => 803764038,
            SupportedModel::QuantizedLargeV3Turbo => 800664009,
        }
    }

    pub fn config_path(&self, data_dir: impl Into<std::path::PathBuf>) -> std::path::PathBuf {
        match self {
            SupportedModel::QuantizedTiny => data_dir
                .into()
                .join("lmz/candle-whisper/main/config-tiny.json"),
            SupportedModel::QuantizedLargeV3Turbo => data_dir
                .into()
                .join("Demonthos/candle-quantized-whisper-large-v3-turbo/main/config.json"),
        }
    }

    pub fn config_url(&self) -> &str {
        match self {
            SupportedModel::QuantizedTiny => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/lmz/candle-whisper/main/config-tiny.json",
            SupportedModel::QuantizedLargeV3Turbo => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/Demonthos/candle-quantized-whisper-large-v3-turbo/main/config.json",
        }
    }

    pub fn config_checksum(&self) -> u32 {
        match self {
            SupportedModel::QuantizedTiny => 2452221368,
            SupportedModel::QuantizedLargeV3Turbo => 472563957,
        }
    }

    pub fn tokenizer_path(&self, data_dir: impl Into<std::path::PathBuf>) -> std::path::PathBuf {
        match self {
            SupportedModel::QuantizedTiny => data_dir
                .into()
                .join("lmz/candle-whisper/main/tokenizer-tiny.json"),
            SupportedModel::QuantizedLargeV3Turbo => data_dir
                .into()
                .join("Demonthos/candle-quantized-whisper-large-v3-turbo/main/tokenizer.json"),
        }
    }

    pub fn tokenizer_url(&self) -> &str {
        match self {
            SupportedModel::QuantizedTiny => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/lmz/candle-whisper/main/tokenizer-tiny.json",
            SupportedModel::QuantizedLargeV3Turbo => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/Demonthos/candle-quantized-whisper-large-v3-turbo/main/tokenizer.json",
        }
    }

    pub fn tokenizer_checksum(&self) -> u32 {
        match self {
            SupportedModel::QuantizedTiny => 1234328512,
            SupportedModel::QuantizedLargeV3Turbo => 1395948910,
        }
    }
}
