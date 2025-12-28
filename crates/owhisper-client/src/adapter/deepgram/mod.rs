mod batch;
mod keywords;
mod language;
mod live;

const SUPPORTED_LANGUAGES: &[&str] = &[
    "en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl", "ko", "zh", "pl", "tr", "uk", "sv",
    "da", "fi", "no", "id", "ms", "th", "vi", "ta", "tl",
];

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    pub fn is_supported_languages(languages: &[hypr_language::Language]) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        SUPPORTED_LANGUAGES.contains(&primary_lang)
    }
}
