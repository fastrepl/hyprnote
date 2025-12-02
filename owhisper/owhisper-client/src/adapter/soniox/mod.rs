mod batch;
mod live;

pub(crate) const DEFAULT_API_HOST: &str = "api.soniox.com";
pub(crate) const DEFAULT_WS_HOST: &str = "stt-rt.soniox.com";

#[derive(Clone, Default)]
pub struct SonioxAdapter;

impl SonioxAdapter {
    pub(crate) fn api_host(api_base: &str) -> String {
        if api_base.is_empty() {
            return DEFAULT_API_HOST.to_string();
        }

        let url: url::Url = api_base.parse().expect("invalid_api_base");
        url.host_str().unwrap_or(DEFAULT_API_HOST).to_string()
    }

    pub(crate) fn ws_host(api_base: &str) -> String {
        let api_host = Self::api_host(api_base);

        if let Some(rest) = api_host.strip_prefix("api.") {
            format!("stt-rt.{}", rest)
        } else {
            DEFAULT_WS_HOST.to_string()
        }
    }
}
