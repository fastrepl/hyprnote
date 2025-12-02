mod batch;
mod live;

pub(crate) const DEFAULT_API_HOST: &str = "api.fireworks.ai";

#[derive(Clone, Default)]
pub struct FireworksAdapter;

impl FireworksAdapter {
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

    pub(crate) fn batch_api_host(api_base: &str) -> String {
        let host = Self::api_host(api_base);
        format!("audio-turbo.{}", host)
    }

    pub(crate) fn ws_host(api_base: &str) -> String {
        let host = Self::api_host(api_base);
        format!("audio-streaming-v2.{}", host)
    }
}
