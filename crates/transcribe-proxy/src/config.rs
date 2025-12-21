use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use owhisper_providers::Provider;

use crate::analytics::SttAnalyticsReporter;

pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 5000;

#[derive(Clone)]
pub struct SttProxyConfig {
    pub api_keys: HashMap<Provider, String>,
    pub default_provider: Provider,
    pub connect_timeout: Duration,
    pub analytics: Option<Arc<dyn SttAnalyticsReporter>>,
    pub upstream_urls: HashMap<Provider, String>,
}

impl SttProxyConfig {
    pub fn new(api_keys: HashMap<Provider, String>) -> Self {
        Self {
            api_keys,
            default_provider: Provider::Deepgram,
            connect_timeout: Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
            analytics: None,
            upstream_urls: HashMap::new(),
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

    pub fn api_key_for(&self, provider: Provider) -> Option<&str> {
        self.api_keys.get(&provider).map(|s| s.as_str())
    }

    pub fn upstream_url_for(&self, provider: Provider) -> Option<&str> {
        self.upstream_urls.get(&provider).map(|s| s.as_str())
    }
}
