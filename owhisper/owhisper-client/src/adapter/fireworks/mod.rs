mod batch;
mod live;

pub(crate) const DEFAULT_API_HOST: &str = "api.fireworks.ai";
const WS_PATH: &str = "/v1/audio/transcriptions/streaming";

#[derive(Clone, Default)]
pub struct FireworksAdapter;

impl FireworksAdapter {
    pub fn is_supported_languages(_languages: &[hypr_language::Language]) -> bool {
        true
    }

    pub fn is_host(base_url: &str) -> bool {
        super::host_matches(base_url, Self::is_fireworks_host)
    }

    pub(crate) fn api_host(api_base: &str) -> String {
        if api_base.is_empty() {
            return DEFAULT_API_HOST.to_string();
        }

        let url: url::Url = match api_base.parse() {
            Ok(u) => u,
            Err(_) => return DEFAULT_API_HOST.to_string(),
        };
        url.host_str().unwrap_or(DEFAULT_API_HOST).to_string()
    }

    pub(crate) fn is_fireworks_host(host: &str) -> bool {
        host.contains("fireworks.ai")
    }

    pub(crate) fn batch_api_host(api_base: &str) -> String {
        let host = Self::api_host(api_base);
        format!("audio-turbo.{}", host)
    }

    pub(crate) fn ws_host(api_base: &str) -> String {
        let host = Self::api_host(api_base);
        format!("audio-streaming-v2.{}", host)
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        let default_url = || {
            (
                format!("wss://audio-streaming-v2.{}{}", DEFAULT_API_HOST, WS_PATH)
                    .parse()
                    .expect("invalid_default_ws_url"),
                Vec::new(),
            )
        };

        if api_base.is_empty() {
            return default_url();
        }

        if let Some(proxy_result) = super::build_proxy_ws_url(api_base) {
            return proxy_result;
        }

        let parsed: url::Url = match api_base.parse() {
            Ok(u) => u,
            Err(_) => return default_url(),
        };

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
    fn test_build_ws_url_from_base_empty() {
        let (url, params) = FireworksAdapter::build_ws_url_from_base("");
        assert_eq!(
            url.as_str(),
            "wss://audio-streaming-v2.api.fireworks.ai/v1/audio/transcriptions/streaming"
        );
        assert!(params.is_empty());
    }

    #[test]
    fn test_build_ws_url_from_base_fireworks() {
        let (url, params) = FireworksAdapter::build_ws_url_from_base("https://api.fireworks.ai");
        assert_eq!(
            url.as_str(),
            "wss://audio-streaming-v2.api.fireworks.ai/v1/audio/transcriptions/streaming"
        );
        assert!(params.is_empty());
    }

    #[test]
    fn test_build_ws_url_from_base_proxy() {
        let (url, params) = FireworksAdapter::build_ws_url_from_base(
            "https://api.hyprnote.com/listen?provider=fireworks",
        );
        assert_eq!(url.as_str(), "wss://api.hyprnote.com/listen");
        assert_eq!(params, vec![("provider".into(), "fireworks".into())]);
    }

    #[test]
    fn test_build_ws_url_from_base_localhost() {
        let (url, params) = FireworksAdapter::build_ws_url_from_base(
            "http://localhost:8787/listen?provider=fireworks",
        );
        assert_eq!(url.as_str(), "ws://localhost:8787/listen");
        assert_eq!(params, vec![("provider".into(), "fireworks".into())]);
    }
}
