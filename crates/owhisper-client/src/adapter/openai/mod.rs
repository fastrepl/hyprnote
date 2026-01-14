mod batch;
mod live;

use owhisper_providers::Provider;

#[derive(Clone, Default)]
pub struct OpenAIAdapter;

impl OpenAIAdapter {
    pub fn is_supported_languages_live(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub fn is_supported_languages_batch(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        if api_base.is_empty() {
            return (
                Provider::OpenAI
                    .default_ws_url()
                    .parse()
                    .expect("invalid_default_ws_url"),
                vec![("intent".to_string(), "transcription".to_string())],
            );
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        let mut existing_params = super::extract_query_params(&parsed);

        if !existing_params.iter().any(|(k, _)| k == "intent") {
            existing_params.push(("intent".to_string(), "transcription".to_string()));
        }

        let host = parsed
            .host_str()
            .unwrap_or(Provider::OpenAI.default_ws_host());
        let mut url: url::Url = format!("wss://{}{}", host, Provider::OpenAI.ws_path())
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
        let (url, params) = OpenAIAdapter::build_ws_url_from_base("");
        assert_eq!(url.as_str(), "wss://api.openai.com/v1/realtime");
        assert_eq!(
            params,
            vec![("intent".to_string(), "transcription".to_string())]
        );
    }

    #[test]
    fn test_build_ws_url_from_base_proxy() {
        let (url, params) =
            OpenAIAdapter::build_ws_url_from_base("https://api.hyprnote.com?provider=openai");
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/listen");
        assert_eq!(params, vec![("provider".to_string(), "openai".to_string())]);
    }

    #[test]
    fn test_build_ws_url_from_base_localhost() {
        let (url, params) =
            OpenAIAdapter::build_ws_url_from_base("http://localhost:8787?provider=openai");
        assert_eq!(url.as_str(), "ws://localhost:8787/listen");
        assert_eq!(params, vec![("provider".to_string(), "openai".to_string())]);
    }

    #[test]
    fn test_is_openai_host() {
        assert!(Provider::OpenAI.is_host("api.openai.com"));
        assert!(Provider::OpenAI.is_host("openai.com"));
        assert!(!Provider::OpenAI.is_host("api.deepgram.com"));
    }
}
