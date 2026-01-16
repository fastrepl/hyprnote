#[cfg(feature = "argmax")]
mod batch;
mod keywords;
mod language;
mod live;

#[cfg(feature = "argmax")]
pub use batch::{StreamingBatchConfig, StreamingBatchEvent, StreamingBatchStream};

pub use language::PARAKEET_V3_LANGS;

#[derive(Clone, Default)]
pub struct ArgmaxAdapter;

impl ArgmaxAdapter {
    pub fn is_supported_languages_live(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        Self::is_supported_languages_impl(languages, model)
    }

    pub fn is_supported_languages_batch(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        Self::is_supported_languages_impl(languages, model)
    }

    fn is_supported_languages_impl(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        let model = model.unwrap_or("");

        if languages.len() > 1 {
            return false;
        }

        if model.contains("parakeet") && model.contains("v2") {
            languages.iter().any(|lang| lang.iso639().code() == "en")
        } else if model.contains("parakeet") && model.contains("v3") {
            languages
                .iter()
                .any(|lang| PARAKEET_V3_LANGS.contains(&lang.iso639().code()))
        } else {
            true
        }
    }
}
