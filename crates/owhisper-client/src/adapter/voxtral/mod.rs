mod batch;

use super::LanguageQuality;

#[derive(Clone, Default)]
pub struct VoxtralAdapter;

impl VoxtralAdapter {
    pub fn is_supported_languages_batch(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub fn language_quality_batch(_languages: &[hypr_language::Language]) -> LanguageQuality {
        LanguageQuality::Good
    }
}
