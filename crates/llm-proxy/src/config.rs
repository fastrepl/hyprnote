//! Configuration for the LLM proxy

use std::sync::Arc;
use std::time::Duration;

use crate::analytics::AnalyticsReporter;
use crate::env::ApiKey;
use crate::provider::{OpenRouterProvider, Provider};

const DEFAULT_TIMEOUT_MS: u64 = 120_000;
const DEFAULT_NUM_RETRIES: usize = 1;
const DEFAULT_MAX_DELAY_SECS: u64 = 2;

/// Configuration for retry behavior
#[derive(Clone)]
pub struct RetryConfig {
    /// Number of retry attempts for failed requests
    pub num_retries: usize,
    /// Maximum delay between retries in seconds
    pub max_delay_secs: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            num_retries: DEFAULT_NUM_RETRIES,
            max_delay_secs: DEFAULT_MAX_DELAY_SECS,
        }
    }
}

/// Main configuration for the LLM proxy
#[derive(Clone)]
pub struct LlmProxyConfig {
    /// API key for the LLM provider
    pub api_key: String,
    /// Request timeout duration
    pub timeout: Duration,
    /// Models to use when tool calling is required
    pub models_tool_calling: Vec<String>,
    /// Default models to use for standard requests
    pub models_default: Vec<String>,
    /// Optional analytics reporter
    pub analytics: Option<Arc<dyn AnalyticsReporter>>,
    /// LLM provider implementation
    pub provider: Arc<dyn Provider>,
    /// Retry configuration
    pub retry_config: RetryConfig,
}

impl LlmProxyConfig {
    /// Create a new configuration with the given API key and default settings
    pub fn new(api_key: impl Into<ApiKey>) -> Self {
        Self {
            api_key: api_key.into().0,
            timeout: Duration::from_millis(DEFAULT_TIMEOUT_MS),
            models_tool_calling: vec![
                "moonshotai/kimi-k2-0905:exacto".into(),
                "anthropic/claude-haiku-4.5".into(),
                "openai/gpt-oss-120b:exacto".into(),
            ],
            models_default: vec![
                "moonshotai/kimi-k2-0905".into(),
                "openai/gpt-5.2-chat".into(),
            ],
            analytics: None,
            provider: Arc::new(OpenRouterProvider::default()),
            retry_config: RetryConfig::default(),
        }
    }

    /// Set the request timeout
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Set the models to use when tool calling is required
    pub fn with_models_tool_calling(mut self, models: Vec<String>) -> Self {
        self.models_tool_calling = models;
        self
    }

    /// Set the default models to use for standard requests
    pub fn with_models_default(mut self, models: Vec<String>) -> Self {
        self.models_default = models;
        self
    }

    /// Set the analytics reporter
    pub fn with_analytics(mut self, reporter: Arc<dyn AnalyticsReporter>) -> Self {
        self.analytics = Some(reporter);
        self
    }

    /// Set the LLM provider
    pub fn with_provider(mut self, provider: Arc<dyn Provider>) -> Self {
        self.provider = provider;
        self
    }

    /// Set the retry configuration
    pub fn with_retry_config(mut self, retry_config: RetryConfig) -> Self {
        self.retry_config = retry_config;
        self
    }
}
