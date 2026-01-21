mod batch;
pub mod error;
mod live;

use crate::providers::Provider;
use serde::Deserialize;

use super::{LanguageQuality, LanguageSupport};

// https://elevenlabs.io/docs/overview/capabilities/speech-to-text
// Accepts both ISO 639-1 (2-letter) and ISO 639-3 (3-letter) codes

const EXCELLENT_LANGS: &[&str] = &[
    "be", "bs", "bg", "ca", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "gl", "de", "el", "hu",
    "is", "id", "it", "ja", "kn", "lv", "mk", "ms", "ml", "no", "pl", "pt", "ro", "ru", "sk", "es",
    "sv", "tr", "uk", "vi",
];

const HIGH_LANGS: &[&str] = &[
    "hy", "az", "bn", "tl", "ka", "gu", "hi", "kk", "lt", "mt", "zh", "mr", "ne", "or", "fa", "sr",
    "sl", "sw", "ta", "te",
];

const GOOD_LANGS: &[&str] = &[
    "af", "ar", "as", "my", "ha", "he", "jv", "ko", "ky", "lb", "mi", "oc", "pa", "tg", "th", "uz",
    "cy",
];

const MODERATE_LANGS: &[&str] = &[
    "am", "lg", "ig", "ga", "km", "ku", "lo", "mn", "ps", "sn", "sd", "so", "ur", "wo", "xh", "yo",
    "zu",
];

const NO_DATA_LANGS: &[&str] = &["ff", "ln", "ny"];

#[derive(Clone, Default)]
pub struct ElevenLabsAdapter;

impl ElevenLabsAdapter {
    pub fn language_support_live(languages: &[hypr_language::Language]) -> LanguageSupport {
        LanguageSupport::min(languages.iter().map(Self::single_language_support))
    }

    pub fn language_support_batch(languages: &[hypr_language::Language]) -> LanguageSupport {
        Self::language_support_live(languages)
    }

    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_live(languages).is_supported()
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_batch(languages).is_supported()
    }

    fn single_language_support(language: &hypr_language::Language) -> LanguageSupport {
        let code = language.iso639().code();
        let quality = if EXCELLENT_LANGS.contains(&code) {
            LanguageQuality::Excellent
        } else if HIGH_LANGS.contains(&code) {
            LanguageQuality::High
        } else if GOOD_LANGS.contains(&code) {
            LanguageQuality::Good
        } else if MODERATE_LANGS.contains(&code) {
            LanguageQuality::Moderate
        } else if NO_DATA_LANGS.contains(&code) {
            LanguageQuality::NoData
        } else {
            return LanguageSupport::NotSupported;
        };
        LanguageSupport::Supported { quality }
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        if api_base.is_empty() {
            return (Self::default_ws_url(), Vec::new());
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        let existing_params = super::extract_query_params(&parsed);
        let url = Self::build_url_with_scheme(&parsed, Provider::ElevenLabs.ws_path(), true);
        (url, existing_params)
    }

    fn build_url_with_scheme(parsed: &url::Url, path: &str, use_ws: bool) -> url::Url {
        let host = parsed
            .host_str()
            .unwrap_or(Provider::ElevenLabs.default_api_host());
        let is_local = super::is_local_host(host);
        let scheme = match (use_ws, is_local) {
            (true, true) => "ws",
            (true, false) => "wss",
            (false, true) => "http",
            (false, false) => "https",
        };
        let host_with_port = match parsed.port() {
            Some(port) => format!("{host}:{port}"),
            None => host.to_string(),
        };
        format!("{scheme}://{host_with_port}{path}")
            .parse()
            .expect("invalid_url")
    }

    fn default_ws_url() -> url::Url {
        Provider::ElevenLabs
            .default_ws_url()
            .parse()
            .expect("invalid_default_ws_url")
    }

    pub(crate) fn batch_api_url(api_base: &str) -> String {
        if api_base.is_empty() {
            return format!(
                "https://{}/v1/speech-to-text",
                Provider::ElevenLabs.default_api_host()
            );
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        Self::build_url_with_scheme(&parsed, "/v1/speech-to-text", false).to_string()
    }
}

#[derive(Debug, Deserialize)]
pub(crate) struct ElevenLabsWord {
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub start: f64,
    #[serde(default)]
    pub end: f64,
    #[serde(default, rename = "type")]
    pub word_type: Option<String>,
    #[serde(default)]
    pub speaker_id: Option<String>,
}

pub(super) fn documented_language_codes() -> Vec<&'static str> {
    let mut codes = Vec::new();
    codes.extend_from_slice(EXCELLENT_LANGS);
    codes.extend_from_slice(HIGH_LANGS);
    codes.extend_from_slice(GOOD_LANGS);
    codes.extend_from_slice(MODERATE_LANGS);
    codes.extend_from_slice(NO_DATA_LANGS);
    codes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base() {
        let cases = [
            (
                "",
                "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
                vec![],
            ),
            (
                "https://api.elevenlabs.io",
                "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
                vec![],
            ),
            (
                "https://api.hyprnote.com?provider=elevenlabs",
                "wss://api.hyprnote.com/listen",
                vec![("provider", "elevenlabs")],
            ),
            (
                "http://localhost:8787/listen?provider=elevenlabs",
                "ws://localhost:8787/listen",
                vec![("provider", "elevenlabs")],
            ),
        ];

        for (input, expected_url, expected_params) in cases {
            let (url, params) = ElevenLabsAdapter::build_ws_url_from_base(input);
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

    #[test]
    fn test_is_host() {
        assert!(Provider::ElevenLabs.matches_url("https://api.elevenlabs.io"));
        assert!(Provider::ElevenLabs.matches_url("https://api.elevenlabs.io/v1"));
        assert!(!Provider::ElevenLabs.matches_url("https://api.deepgram.com"));
        assert!(!Provider::ElevenLabs.matches_url("https://api.assemblyai.com"));
    }

    #[test]
    fn test_batch_api_url_empty_uses_default() {
        let url = ElevenLabsAdapter::batch_api_url("");
        assert_eq!(url, "https://api.elevenlabs.io/v1/speech-to-text");
    }

    #[test]
    fn test_batch_api_url_custom() {
        let url = ElevenLabsAdapter::batch_api_url("https://custom.elevenlabs.io");
        assert_eq!(url, "https://custom.elevenlabs.io/v1/speech-to-text");
    }
}
