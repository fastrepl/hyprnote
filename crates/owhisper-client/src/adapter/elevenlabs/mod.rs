mod batch;
mod live;

use owhisper_providers::Provider;
use serde::Deserialize;

const SUPPORTED_LANGUAGES: &[&str] = &[
    "af", "sq", "am", "ar", "hy", "as", "az", "ba", "eu", "be", "bn", "bs", "br", "bg", "ca", "zh",
    "hr", "cs", "da", "nl", "en", "et", "fo", "fi", "fr", "gl", "ka", "de", "el", "gu", "ht", "ha",
    "he", "hi", "hu", "is", "id", "it", "ja", "jw", "kn", "kk", "km", "ko", "lo", "la", "lv", "ln",
    "lt", "lb", "mk", "mg", "ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "nn", "oc", "ps",
    "fa", "pl", "pt", "pa", "ro", "ru", "sa", "sr", "sn", "sd", "si", "sk", "sl", "so", "es", "su",
    "sw", "sv", "tl", "tg", "ta", "tt", "te", "th", "bo", "tr", "tk", "uk", "ur", "uz", "vi", "cy",
    "wo", "yi", "yo",
];

#[derive(Clone, Default)]
pub struct ElevenLabsAdapter;

impl ElevenLabsAdapter {
    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        Self::is_supported_languages_impl(languages)
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        Self::is_supported_languages_impl(languages)
    }

    fn is_supported_languages_impl(languages: &[hypr_language::Language]) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        SUPPORTED_LANGUAGES.contains(&primary_lang)
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

pub(super) fn documented_language_codes() -> &'static [&'static str] {
    SUPPORTED_LANGUAGES
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
