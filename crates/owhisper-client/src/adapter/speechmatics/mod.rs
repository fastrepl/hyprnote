mod batch;
mod live;

const SUPPORTED_LANGUAGES: &[&str] = &[
    "ar", "ba", "eu", "be", "bn", "bg", "yue", "ca", "hr", "cs", "da", "nl", "en", "eo", "et",
    "fi", "fr", "gl", "de", "el", "he", "hi", "hu", "id", "ia", "ga", "it", "ja", "ko", "lv", "lt",
    "ms", "mt", "cmn", "mr", "mn", "no", "fa", "pl", "pt", "ro", "ru", "sk", "sl", "es", "sw",
    "sv", "tl", "ta", "th", "tr", "uk", "ur", "ug", "vi", "cy",
];

#[derive(Clone, Default)]
pub struct SpeechmaticsAdapter;

impl SpeechmaticsAdapter {
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

    pub(crate) fn streaming_ws_url(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        use crate::providers::Provider;

        if api_base.is_empty() {
            return (
                Provider::Speechmatics
                    .default_ws_url()
                    .parse()
                    .expect("invalid_default_ws_url"),
                Vec::new(),
            );
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let mut url: url::Url = api_base.parse().expect("invalid_api_base");
        let existing_params = super::extract_query_params(&url);
        url.set_query(None);

        super::append_path_if_missing(&mut url, Provider::Speechmatics.ws_path());
        super::set_scheme_from_host(&mut url);

        (url, existing_params)
    }

    pub(crate) fn batch_api_url(api_base: &str) -> url::Url {
        use crate::providers::Provider;

        if api_base.is_empty() {
            return Provider::Speechmatics
                .default_api_url()
                .unwrap()
                .parse()
                .expect("invalid_default_api_url");
        }

        let url: url::Url = api_base.parse().expect("invalid_api_base");
        url
    }
}

pub(super) fn documented_language_codes() -> &'static [&'static str] {
    SUPPORTED_LANGUAGES
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streaming_ws_url_empty_uses_default() {
        let (url, params) = SpeechmaticsAdapter::streaming_ws_url("");
        assert_eq!(url.as_str(), "wss://eu.rt.speechmatics.com/v2");
        assert!(params.is_empty());
    }

    #[test]
    fn test_streaming_ws_url_proxy() {
        let (url, params) =
            SpeechmaticsAdapter::streaming_ws_url("https://api.hyprnote.com?provider=speechmatics");
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/listen");
        assert_eq!(params, vec![("provider".into(), "speechmatics".into())]);
    }

    #[test]
    fn test_streaming_ws_url_localhost() {
        let (url, params) =
            SpeechmaticsAdapter::streaming_ws_url("http://localhost:8787?provider=speechmatics");
        assert_eq!(url.as_str(), "ws://localhost:8787/listen");
        assert_eq!(params, vec![("provider".into(), "speechmatics".into())]);
    }
}
