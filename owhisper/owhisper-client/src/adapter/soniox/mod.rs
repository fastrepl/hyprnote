mod batch;
mod live;

pub(crate) const DEFAULT_API_HOST: &str = "api.soniox.com";
pub(crate) const DEFAULT_WS_HOST: &str = "stt-rt.soniox.com";

#[derive(Clone, Default)]
pub struct SonioxAdapter;

impl SonioxAdapter {
    pub fn is_supported_languages(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub fn is_host(base_url: &str) -> bool {
        super::host_matches(base_url, Self::is_soniox_host)
    }

    pub(crate) fn api_host(api_base: &str) -> String {
        if api_base.is_empty() {
            return DEFAULT_API_HOST.to_string();
        }

        let url: url::Url = api_base.parse().expect("invalid_api_base");
        url.host_str().unwrap_or(DEFAULT_API_HOST).to_string()
    }

    pub(crate) fn is_soniox_host(host: &str) -> bool {
        host.contains("soniox.com")
    }

    pub(crate) fn ws_host(api_base: &str) -> String {
        let api_host = Self::api_host(api_base);

        if let Some(rest) = api_host.strip_prefix("api.") {
            format!("stt-rt.{}", rest)
        } else {
            DEFAULT_WS_HOST.to_string()
        }
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        const WS_PATH: &str = "/transcribe-websocket";

        if api_base.is_empty() {
            return (
                format!("wss://{}{}", DEFAULT_WS_HOST, WS_PATH)
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

        let url: url::Url = format!("wss://{}{}", Self::ws_host(api_base), WS_PATH)
            .parse()
            .expect("invalid_ws_url");
        (url, existing_params)
    }
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
