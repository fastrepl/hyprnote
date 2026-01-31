use crate::config::SttProxyConfig;
use crate::provider_selector::SelectedProvider;
use crate::query_params::QueryParams;
use crate::relay::WebSocketProxy;

pub enum ProxyBuildError {
    SessionInitFailed(String),
    ProxyError(crate::ProxyError),
}

impl From<crate::ProxyError> for ProxyBuildError {
    fn from(e: crate::ProxyError) -> Self {
        ProxyBuildError::ProxyError(e)
    }
}

pub fn parse_param<T: std::str::FromStr>(params: &QueryParams, key: &str, default: T) -> T {
    params
        .get_first(key)
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

macro_rules! finalize_proxy_builder {
    ($builder:expr, $provider:expr, $config:expr) => {
        finalize_proxy_builder!($builder, $provider, $config, None::<String>)
    };
    ($builder:expr, $provider:expr, $config:expr, $distinct_id:expr) => {
        match &$config.analytics {
            Some(analytics) => {
                let analytics = analytics.clone();
                let provider_name = format!("{:?}", $provider).to_lowercase();
                let distinct_id: Option<String> = $distinct_id;
                $builder
                    .on_close(move |duration| {
                        let analytics = analytics.clone();
                        let provider_name = provider_name.clone();
                        let distinct_id = distinct_id.clone();
                        async move {
                            analytics
                                .report_stt($crate::analytics::SttEvent {
                                    distinct_id,
                                    provider: provider_name,
                                    duration,
                                })
                                .await;
                        }
                    })
                    .build()
            }
            None => $builder.build(),
        }
    };
}

pub(super) use finalize_proxy_builder;

pub fn build_proxy_with_url(
    selected: &SelectedProvider,
    upstream_url: &str,
    config: &SttProxyConfig,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = selected.provider();
    let builder = WebSocketProxy::builder()
        .upstream_url(upstream_url)
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .apply_auth(selected);

    finalize_proxy_builder!(builder, provider, config)
}
