use hypr_am::AmModel;
use hypr_whisper_local_model::WhisperModel;

pub static SUPPORTED_MODELS: [SupportedSttModel; 9] = [
    SupportedSttModel::Whisper(WhisperModel::QuantizedTiny),
    SupportedSttModel::Whisper(WhisperModel::QuantizedTinyEn),
    SupportedSttModel::Whisper(WhisperModel::QuantizedBase),
    SupportedSttModel::Whisper(WhisperModel::QuantizedBaseEn),
    SupportedSttModel::Whisper(WhisperModel::QuantizedSmall),
    SupportedSttModel::Whisper(WhisperModel::QuantizedSmallEn),
    SupportedSttModel::Whisper(WhisperModel::QuantizedLargeTurbo),
    SupportedSttModel::Am(AmModel::WhisperLargeV3),
    SupportedSttModel::Am(AmModel::ParakeetV2),
];

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SttModelInfo {
    pub key: SupportedSttModel,
    pub display_name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, Eq, Hash, PartialEq)]
#[serde(untagged)]
pub enum SupportedSttModel {
    Whisper(WhisperModel),
    Am(AmModel),
}

impl SupportedSttModel {
    pub fn info(&self) -> SttModelInfo {
        match self {
            SupportedSttModel::Whisper(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                size_bytes: model.model_size_bytes(),
            },
            SupportedSttModel::Am(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                size_bytes: model.model_size_bytes(),
            },
        }
    }
}
