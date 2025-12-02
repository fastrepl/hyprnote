mod batch;
mod live;

#[derive(Clone, Default)]
pub struct AssemblyAIAdapter;

impl AssemblyAIAdapter {
    pub(crate) fn streaming_ws_url(api_base: &str) -> url::Url {
        if api_base.is_empty() {
            return "wss://streaming.assemblyai.com/v3/ws"
                .parse()
                .expect("invalid_default_ws_url");
        }

        let mut url: url::Url = api_base.parse().expect("invalid_api_base");

        let mut path = url.path().to_string();
        if !path.ends_with('/') {
            path.push('/');
        }
        path.push_str("v3/ws");
        url.set_path(&path);

        if let Some(host) = url.host_str() {
            if host.contains("127.0.0.1") || host.contains("localhost") || host.contains("0.0.0.0")
            {
                let _ = url.set_scheme("ws");
            } else {
                let _ = url.set_scheme("wss");
            }
        }

        url
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
