//! Proxy configuration and builder

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use owhisper_client::Provider;

use super::env::{ApiKeys, Env};
use crate::analytics::SttAnalyticsReporter;
use crate::provider::{HyprnoteRouter, HyprnoteRoutingConfig, ProviderSelector};

/// Default connection timeout in milliseconds (7 seconds)
pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 7 * 1000;

/// Main configuration for the STT proxy
///
/// This struct holds all configuration needed to run the proxy, including API keys,
/// provider selection, timeouts, and optional features like analytics and routing.
#[derive(Clone)]
pub struct SttProxyConfig {
    /// API keys for each provider
    pub api_keys: HashMap<Provider, String>,
    /// Default provider to use when no specific provider is requested
    pub default_provider: Provider,
    /// Timeout for establishing upstream connections
    pub connect_timeout: Duration,
    /// Optional analytics reporter
    pub analytics: Option<Arc<dyn SttAnalyticsReporter>>,
    /// Optional custom upstream URLs per provider (for testing/dev)
    pub upstream_urls: HashMap<Provider, String>,
    /// Optional HyprNote intelligent routing configuration
    pub hyprnote_routing: Option<HyprnoteRoutingConfig>,
}

impl SttProxyConfig {
    /// Creates a new configuration from environment variables
    ///
    /// Uses default values for all optional settings. Use the builder methods
    /// to customize the configuration.
    pub fn new(env: &Env) -> Self {
        Self {
            api_keys: ApiKeys::from(env).0,
            default_provider: Provider::Deepgram,
            connect_timeout: Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
            analytics: None,
            upstream_urls: HashMap::new(),
            hyprnote_routing: None,
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

    pub fn with_hyprnote_routing(mut self, config: HyprnoteRoutingConfig) -> Self {
        self.hyprnote_routing = Some(config);
        self
    }

    pub fn provider_selector(&self) -> ProviderSelector {
        ProviderSelector::new(
            self.api_keys.clone(),
            self.default_provider,
            self.upstream_urls.clone(),
        )
    }

    pub fn hyprnote_router(&self) -> Option<HyprnoteRouter> {
        self.hyprnote_routing.clone().map(HyprnoteRouter::new)
    }
}
