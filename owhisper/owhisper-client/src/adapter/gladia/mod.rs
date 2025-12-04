mod batch;
mod live;

pub(crate) const DEFAULT_API_HOST: &str = "api.gladia.io";
pub(crate) const WS_PATH: &str = "/v2/live";
const API_BASE: &str = "https://api.gladia.io/v2";

#[derive(Clone, Default)]
pub struct GladiaAdapter;

impl GladiaAdapter {
    pub fn is_supported_languages(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub fn is_host(base_url: &str) -> bool {
        super::host_matches(base_url, Self::is_gladia_host)
    }

    pub(crate) fn is_gladia_host(host: &str) -> bool {
        host.contains("gladia.io")
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
        let url = Self::build_url_with_scheme(&parsed, WS_PATH, true);
        (url, existing_params)
    }

    pub(crate) fn build_http_url(api_base: &str) -> url::Url {
        if api_base.is_empty() {
            return Self::default_http_url();
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        Self::build_url_with_scheme(&parsed, WS_PATH, false)
    }

    fn build_url_with_scheme(parsed: &url::Url, path: &str, use_ws: bool) -> url::Url {
        let host = parsed.host_str().unwrap_or(DEFAULT_API_HOST);
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
        format!("wss://{}{}", DEFAULT_API_HOST, WS_PATH)
            .parse()
            .expect("invalid_default_ws_url")
    }

    fn default_http_url() -> url::Url {
        format!("https://{}{}", DEFAULT_API_HOST, WS_PATH)
            .parse()
            .expect("invalid_default_http_url")
    }

    pub(crate) fn batch_api_url(api_base: &str) -> url::Url {
        if api_base.is_empty() {
            return API_BASE.parse().expect("invalid_default_api_url");
        }

        api_base.parse().expect("invalid_api_base")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base() {
        let cases = [
            ("", "wss://api.gladia.io/v2/live", vec![]),
            (
                "https://api.gladia.io",
                "wss://api.gladia.io/v2/live",
                vec![],
            ),
            (
                "https://api.gladia.io:8443",
                "wss://api.gladia.io:8443/v2/live",
                vec![],
            ),
            (
                "https://api.hyprnote.com?provider=gladia",
                "wss://api.hyprnote.com/listen",
                vec![("provider", "gladia")],
            ),
            (
                "http://localhost:8787/listen?provider=gladia",
                "ws://localhost:8787/listen",
                vec![("provider", "gladia")],
            ),
        ];

        for (input, expected_url, expected_params) in cases {
            let (url, params) = GladiaAdapter::build_ws_url_from_base(input);
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
        assert!(GladiaAdapter::is_host("https://api.gladia.io"));
        assert!(GladiaAdapter::is_host("https://api.gladia.io/v2"));
        assert!(!GladiaAdapter::is_host("https://api.deepgram.com"));
        assert!(!GladiaAdapter::is_host("https://api.assemblyai.com"));
    }

    #[test]
    fn test_batch_api_url_empty_uses_default() {
        let url = GladiaAdapter::batch_api_url("");
        assert_eq!(url.as_str(), "https://api.gladia.io/v2");
    }

    #[test]
    fn test_batch_api_url_custom() {
        let url = GladiaAdapter::batch_api_url("https://custom.gladia.io/v2");
        assert_eq!(url.as_str(), "https://custom.gladia.io/v2");
    }
}
