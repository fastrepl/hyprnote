use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use owhisper_client::Provider;

use crate::analytics::SttAnalyticsReporter;
use crate::auto_routing::{AutoRouter, AutoRoutingConfig};
use crate::provider_selector::ProviderSelector;

pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 7 * 1000;

#[derive(Clone)]
pub struct SttProxyConfig {
    pub api_keys: HashMap<Provider, String>,
    pub default_provider: Provider,
    pub connect_timeout: Duration,
    pub analytics: Option<Arc<dyn SttAnalyticsReporter>>,
    pub upstream_urls: HashMap<Provider, String>,
    pub auto_routing: Option<AutoRoutingConfig>,
}

impl SttProxyConfig {
    pub fn new(api_keys: HashMap<Provider, String>) -> Self {
        Self {
            api_keys,
            default_provider: Provider::Deepgram,
            connect_timeout: Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
            analytics: None,
            upstream_urls: HashMap::new(),
            auto_routing: None,
        }
    }

    pub fn with_default_provider(mut self, provider: Provider) -> Self {
        self.default_provider = provider;
        self
    }

    pub fn with_connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    pub fn with_analytics(mut self, analytics: Arc<dyn SttAnalyticsReporter>) -> Self {
        self.analytics = Some(analytics);
        self
    }

    pub fn with_upstream_url(mut self, provider: Provider, url: impl Into<String>) -> Self {
        self.upstream_urls.insert(provider, url.into());
        self
    }

    pub fn with_auto_routing(mut self, config: AutoRoutingConfig) -> Self {
        self.auto_routing = Some(config);
        self
    }

    pub fn provider_selector(&self) -> ProviderSelector {
        ProviderSelector::new(
            self.api_keys.clone(),
            self.default_provider,
            self.upstream_urls.clone(),
        )
    }

    pub fn auto_router(&self) -> Option<AutoRouter> {
        self.auto_routing.clone().map(AutoRouter::new)
    }
}
