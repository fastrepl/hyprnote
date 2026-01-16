mod batch;
mod live;

use batch::SUPPORTED_LANGUAGES;
use live::STREAMING_LANGUAGES;

#[derive(Clone, Default)]
pub struct AssemblyAIAdapter;

impl AssemblyAIAdapter {
    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        STREAMING_LANGUAGES.contains(&primary_lang)
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        SUPPORTED_LANGUAGES.contains(&primary_lang)
    }
}

pub(super) fn documented_language_codes_live() -> &'static [&'static str] {
    STREAMING_LANGUAGES
}

pub(super) fn documented_language_codes_batch() -> &'static [&'static str] {
    SUPPORTED_LANGUAGES
}

impl AssemblyAIAdapter {
    pub(crate) fn streaming_ws_url(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        use crate::providers::Provider;

        if api_base.is_empty() {
            return (
                Provider::AssemblyAI
                    .default_ws_url()
                    .parse()
                    .expect("invalid_default_ws_url"),
                Vec::new(),
            );
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        if api_base.contains(".eu.") || api_base.ends_with("-eu") {
            return (
                "wss://streaming.eu.assemblyai.com/v3/ws"
                    .parse()
                    .expect("invalid_eu_ws_url"),
                Vec::new(),
            );
        }

        let mut url: url::Url = api_base.parse().expect("invalid_api_base");
        let existing_params = super::extract_query_params(&url);
        url.set_query(None);

        super::append_path_if_missing(&mut url, Provider::AssemblyAI.ws_path());
        super::set_scheme_from_host(&mut url);

        (url, existing_params)
    }

    pub(crate) fn batch_api_url(api_base: &str) -> url::Url {
        use crate::providers::Provider;

        if api_base.is_empty() {
            return Provider::AssemblyAI
                .default_api_url()
                .unwrap()
                .parse()
                .expect("invalid_default_api_url");
        }

        let url: url::Url = api_base.parse().expect("invalid_api_base");
        url
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streaming_ws_url_appends_v3_ws() {
        let (url, params) = AssemblyAIAdapter::streaming_ws_url("https://api.assemblyai.com");
        assert_eq!(url.as_str(), "wss://api.assemblyai.com/v3/ws");
        assert!(params.is_empty());
    }

    #[test]
    fn test_streaming_ws_url_empty_uses_default() {
        let (url, params) = AssemblyAIAdapter::streaming_ws_url("");
        assert_eq!(url.as_str(), "wss://streaming.assemblyai.com/v3/ws");
        assert!(params.is_empty());
    }

    #[test]
    fn test_streaming_ws_url_proxy() {
        let (url, params) =
            AssemblyAIAdapter::streaming_ws_url("https://api.hyprnote.com?provider=assemblyai");
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/listen");
        assert_eq!(params, vec![("provider".into(), "assemblyai".into())]);
    }

    #[test]
    fn test_streaming_ws_url_localhost() {
        let (url, params) =
            AssemblyAIAdapter::streaming_ws_url("http://localhost:8787?provider=assemblyai");
        assert_eq!(url.as_str(), "ws://localhost:8787/listen");
        assert_eq!(params, vec![("provider".into(), "assemblyai".into())]);
    }
}
