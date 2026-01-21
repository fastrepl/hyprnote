#[cfg(feature = "argmax")]
mod batch;
mod keywords;
mod language;
mod live;

#[cfg(feature = "argmax")]
pub use batch::{StreamingBatchConfig, StreamingBatchEvent, StreamingBatchStream};

pub use language::PARAKEET_V3_LANGS;

use super::LanguageQuality;

#[derive(Clone, Default)]
pub struct ArgmaxAdapter;

impl ArgmaxAdapter {
    pub fn is_supported_languages_live(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        Self::language_quality_live(languages, model).is_supported()
    }

    pub fn is_supported_languages_batch(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        Self::language_quality_live(languages, model).is_supported()
    }

    pub fn language_quality_live(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> LanguageQuality {
        let model = model.unwrap_or("");

        if languages.len() > 1 {
            return LanguageQuality::NotSupported;
        }

        if model.contains("parakeet") && model.contains("v2") {
            if languages.iter().any(|lang| lang.iso639().code() == "en") {
                LanguageQuality::NoData
            } else {
                LanguageQuality::NotSupported
            }
        } else if model.contains("parakeet") && model.contains("v3") {
            if languages
                .iter()
                .any(|lang| PARAKEET_V3_LANGS.contains(&lang.iso639().code()))
            {
                LanguageQuality::NoData
            } else {
                LanguageQuality::NotSupported
            }
        } else {
            LanguageQuality::NoData
        }
    }
}
