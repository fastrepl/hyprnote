mod batch;
mod keywords;
mod language;
mod live;

// https://developers.deepgram.com/docs/models-languages-overview
const SUPPORTED_LANGUAGES: &[&str] = &[
    "bg", "ca", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hi", "hu", "id", "it", "ja",
    "ko", "lt", "lv", "ms", "nl", "no", "pl", "pt", "ro", "ru", "sk", "sv", "th", "tr", "uk", "vi",
    "zh",
];

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    pub fn is_supported_languages(languages: &[hypr_language::Language]) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639_code()).unwrap_or("en");
        SUPPORTED_LANGUAGES.contains(&primary_lang)
    }
}
