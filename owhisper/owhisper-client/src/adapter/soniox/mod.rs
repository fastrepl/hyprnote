mod batch;
mod live;

pub(crate) const DEFAULT_API_HOST: &str = "api.soniox.com";
pub(crate) const DEFAULT_WS_HOST: &str = "stt-rt.soniox.com";

// https://soniox.com/docs/stt/supported-languages
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

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        let host = parsed.host_str().unwrap_or(DEFAULT_API_HOST);
        let existing_params = super::extract_query_params(&parsed);

        if Self::is_soniox_host(host) {
            let url: url::Url = format!("wss://{}{}", Self::ws_host(api_base), WS_PATH)
                .parse()
                .expect("invalid_ws_url");
            (url, existing_params)
        } else {
            let mut url = parsed;
            url.set_query(None);
            super::append_path_if_missing(&mut url, WS_PATH);
            super::set_scheme_from_host(&mut url);
            (url, existing_params)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base_empty() {
        let (url, params) = SonioxAdapter::build_ws_url_from_base("");
        assert_eq!(url.as_str(), "wss://stt-rt.soniox.com/transcribe-websocket");
        assert!(params.is_empty());
    }

    #[test]
    fn test_build_ws_url_from_base_soniox() {
        let (url, params) = SonioxAdapter::build_ws_url_from_base("https://api.soniox.com");
        assert_eq!(url.as_str(), "wss://stt-rt.soniox.com/transcribe-websocket");
        assert!(params.is_empty());
    }

    #[test]
    fn test_build_ws_url_from_base_proxy() {
        let (url, params) = SonioxAdapter::build_ws_url_from_base(
            "https://api.hyprnote.com/listen?provider=soniox",
        );
        assert_eq!(
            url.as_str(),
            "wss://api.hyprnote.com/listen/transcribe-websocket"
        );
        assert_eq!(params, vec![("provider".into(), "soniox".into())]);
    }

    #[test]
    fn test_build_ws_url_from_base_proxy_no_double_path() {
        let (url, params) = SonioxAdapter::build_ws_url_from_base(
            "https://api.hyprnote.com/transcribe-websocket?provider=soniox",
        );
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/transcribe-websocket");
        assert_eq!(params, vec![("provider".into(), "soniox".into())]);
    }
}
