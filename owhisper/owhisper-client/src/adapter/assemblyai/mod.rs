mod batch;
mod live;

// https://www.assemblyai.com/docs/getting-started/supported-languages
#[derive(Clone, Default)]
pub struct AssemblyAIAdapter;

impl AssemblyAIAdapter {
    pub fn is_supported_languages(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub fn is_host(base_url: &str) -> bool {
        super::host_matches(base_url, |h| h.contains("assemblyai.com"))
    }
}

const WS_PATH: &str = "/v3/ws";

impl AssemblyAIAdapter {
    pub(crate) fn streaming_ws_url(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        if api_base.is_empty() {
            return (
                "wss://streaming.assemblyai.com/v3/ws"
                    .parse()
                    .expect("invalid_default_ws_url"),
                Vec::new(),
            );
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

        super::append_path_if_missing(&mut url, WS_PATH);
        super::set_scheme_from_host(&mut url);

        (url, existing_params)
    }

    pub(crate) fn batch_api_url(api_base: &str) -> url::Url {
        if api_base.is_empty() {
            return "https://api.assemblyai.com/v2"
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
    fn test_streaming_ws_url_preserves_query_params() {
        let (url, params) =
            AssemblyAIAdapter::streaming_ws_url("https://api.hyprnote.com/v1?provider=assemblyai");
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/v1/v3/ws");
        assert_eq!(params, vec![("provider".into(), "assemblyai".into())]);
    }

    #[test]
    fn test_streaming_ws_url_no_double_v3_ws() {
        let (url, params) = AssemblyAIAdapter::streaming_ws_url(
            "https://api.hyprnote.com/v3/ws?provider=assemblyai",
        );
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/v3/ws");
        assert_eq!(params, vec![("provider".into(), "assemblyai".into())]);
    }

    #[test]
    fn test_streaming_ws_url_empty_uses_default() {
        let (url, params) = AssemblyAIAdapter::streaming_ws_url("");
        assert_eq!(url.as_str(), "wss://streaming.assemblyai.com/v3/ws");
        assert!(params.is_empty());
    }
}
