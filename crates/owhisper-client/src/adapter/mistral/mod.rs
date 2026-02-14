mod batch;
mod live;

use crate::providers::Provider;

use super::{LanguageQuality, LanguageSupport};

#[derive(Clone, Default)]
pub struct MistralAdapter;

impl MistralAdapter {
    pub fn language_support_live(_languages: &[hypr_language::Language]) -> LanguageSupport {
        LanguageSupport::Supported {
            quality: LanguageQuality::NoData,
        }
    }

    pub fn language_support_batch(_languages: &[hypr_language::Language]) -> LanguageSupport {
        Self::language_support_live(_languages)
    }

    pub fn is_supported_languages_live(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_live(languages).is_supported()
    }

    pub fn is_supported_languages_batch(languages: &[hypr_language::Language]) -> bool {
        Self::language_support_batch(languages).is_supported()
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        if api_base.is_empty() {
            return (
                Provider::Mistral
                    .default_ws_url()
                    .parse()
                    .expect("invalid_default_ws_url"),
                vec![],
            );
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        let existing_params = super::extract_query_params(&parsed);

        let host = parsed
            .host_str()
            .unwrap_or(Provider::Mistral.default_ws_host());
        let mut url: url::Url = format!("wss://{}{}", host, Provider::Mistral.ws_path())
            .parse()
            .expect("invalid_ws_url");

        super::set_scheme_from_host(&mut url);

        (url, existing_params)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base_empty() {
        let (url, params) = MistralAdapter::build_ws_url_from_base("");
        assert_eq!(
            url.as_str(),
            "wss://api.mistral.ai/v1/audio/transcriptions/realtime"
        );
        assert!(params.is_empty());
    }

    #[test]
    fn test_build_ws_url_from_base_proxy() {
        let (url, params) =
            MistralAdapter::build_ws_url_from_base("https://api.hyprnote.com?provider=mistral");
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/listen");
        assert_eq!(
            params,
            vec![("provider".to_string(), "mistral".to_string())]
        );
    }

    #[test]
    fn test_is_mistral_host() {
        assert!(Provider::Mistral.is_host("api.mistral.ai"));
        assert!(Provider::Mistral.is_host("mistral.ai"));
        assert!(!Provider::Mistral.is_host("api.openai.com"));
    }
}
