mod batch;
pub mod error;
mod live;

use super::LanguageQuality;

// https://soniox.com/docs/stt/concepts/supported-languages
const SUPPORTED_LANGUAGES: &[&str] = &[
    "af", "sq", "ar", "az", "eu", "be", "bn", "bs", "bg", "ca", "zh", "hr", "cs", "da", "nl", "en",
    "et", "fi", "fr", "gl", "de", "el", "gu", "he", "hi", "hu", "id", "it", "ja", "kn", "kk", "ko",
    "lv", "lt", "mk", "ms", "ml", "mr", "no", "fa", "pl", "pt", "pa", "ro", "ru", "sr", "sk", "sl",
    "es", "sw", "sv", "tl", "ta", "te", "th", "tr", "uk", "ur", "vi", "cy",
];

const EXCELLENT_LANGS: &[&str] = &["ko", "ro", "it", "pt", "es", "vi"];

const HIGH_LANGS: &[&str] = &[
    "bg", "hu", "fr", "pl", "ru", "bn", "ur", "en", "zh", "bs", "sl", "mr", "de", "be", "af", "el",
    "hi", "he",
];

const GOOD_LANGS: &[&str] = &[
    "sq", "da", "gu", "az", "sr", "sv", "te", "no", "sk", "uk", "ja", "id", "tr", "kk", "sw", "nl",
    "lt", "hr", "th",
];

const MODERATE_LANGS: &[&str] = &[
    "et", "ta", "cs", "ms", "pa", "lv", "fi", "eu", "ca", "ml", "tl", "kn", "fa", "gl",
];

#[derive(Clone, Default)]
pub struct SonioxAdapter;

impl SonioxAdapter {
    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        Self::language_quality_live(languages).is_supported()
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        Self::language_quality_live(languages).is_supported()
    }

    pub fn language_quality_live(languages: &[hypr_language::Language]) -> LanguageQuality {
        let qualities = languages.iter().map(Self::single_language_quality);
        LanguageQuality::min_quality(qualities)
    }

    fn single_language_quality(language: &hypr_language::Language) -> LanguageQuality {
        let code = language.iso639().code();
        if EXCELLENT_LANGS.contains(&code) {
            LanguageQuality::Excellent
        } else if HIGH_LANGS.contains(&code) {
            LanguageQuality::High
        } else if GOOD_LANGS.contains(&code) {
            LanguageQuality::Good
        } else if MODERATE_LANGS.contains(&code) {
            LanguageQuality::Moderate
        } else if SUPPORTED_LANGUAGES.contains(&code) {
            LanguageQuality::NoData
        } else {
            LanguageQuality::NotSupported
        }
    }

    pub(crate) fn api_host(api_base: &str) -> String {
        use crate::providers::Provider;

        let default_host = Provider::Soniox.default_api_host();

        if api_base.is_empty() {
            return default_host.to_string();
        }

        let url: url::Url = api_base.parse().expect("invalid_api_base");
        url.host_str().unwrap_or(default_host).to_string()
    }

    pub(crate) fn ws_host(api_base: &str) -> String {
        use crate::providers::Provider;

        let api_host = Self::api_host(api_base);

        if let Some(rest) = api_host.strip_prefix("api.") {
            format!("stt-rt.{}", rest)
        } else {
            Provider::Soniox.default_ws_host().to_string()
        }
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        use crate::providers::Provider;

        if api_base.is_empty() {
            return (
                Provider::Soniox
                    .default_ws_url()
                    .parse()
                    .expect("invalid_default_ws_url"),
                Vec::new(),
            );
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        let existing_params = super::extract_query_params(&parsed);

        let url: url::Url = format!(
            "wss://{}{}",
            Self::ws_host(api_base),
            Provider::Soniox.ws_path()
        )
        .parse()
        .expect("invalid_ws_url");
        (url, existing_params)
    }
}

pub(super) fn documented_language_codes() -> &'static [&'static str] {
    SUPPORTED_LANGUAGES
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base() {
        let cases = [
            ("", "wss://stt-rt.soniox.com/transcribe-websocket", vec![]),
            (
                "https://api.soniox.com",
                "wss://stt-rt.soniox.com/transcribe-websocket",
                vec![],
            ),
            (
                "https://api.hyprnote.com?provider=soniox",
                "wss://api.hyprnote.com/listen",
                vec![("provider", "soniox")],
            ),
            (
                "https://api.hyprnote.com/listen?provider=soniox",
                "wss://api.hyprnote.com/listen",
                vec![("provider", "soniox")],
            ),
            (
                "http://localhost:8787/listen?provider=soniox",
                "ws://localhost:8787/listen",
                vec![("provider", "soniox")],
            ),
        ];

        for (input, expected_url, expected_params) in cases {
            let (url, params) = SonioxAdapter::build_ws_url_from_base(input);
            assert_eq!(url.as_str(), expected_url, "input: {}", input);
            assert_eq!(
                params,
                expected_params
                    .into_iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect::<Vec<_>>(),
                "input: {}",
                input
            );
        }
    }
}
