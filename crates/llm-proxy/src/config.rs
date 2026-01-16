use std::sync::Arc;
use std::time::Duration;

use crate::analytics::AnalyticsReporter;
use crate::provider::{OpenRouterProvider, Provider};

#[allow(deprecated)]
use crate::types::OPENROUTER_URL;

const DEFAULT_TIMEOUT_MS: u64 = 120_000;

#[derive(Clone)]
pub struct LlmProxyConfig {
    pub api_key: String,
    pub timeout: Duration,
    pub models_tool_calling: Vec<String>,
    pub models_default: Vec<String>,
    pub analytics: Option<Arc<dyn AnalyticsReporter>>,
    pub provider: Arc<dyn Provider>,
    #[deprecated(since = "0.1.0", note = "Use provider.base_url() instead")]
    pub base_url: String,
}

impl LlmProxyConfig {
    pub fn new(api_key: impl Into<String>) -> Self {
        let provider = Arc::new(OpenRouterProvider::default());
        #[allow(deprecated)]
        let base_url = OPENROUTER_URL.to_string();

        Self {
            api_key: api_key.into(),
            timeout: Duration::from_millis(DEFAULT_TIMEOUT_MS),
            models_tool_calling: vec![
                "moonshotai/kimi-k2-0905:exacto".into(),
                "anthropic/claude-haiku-4.5".into(),
                "openai/gpt-oss-120b:exacto".into(),
            ],
            models_default: vec![
                "moonshotai/kimi-k2-0905".into(),
                "openai/gpt-5.1-chat".into(),
            ],
            analytics: None,
            provider,
            base_url,
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_models_tool_calling(mut self, models: Vec<String>) -> Self {
        self.models_tool_calling = models;
        self
    }

    pub fn with_models_default(mut self, models: Vec<String>) -> Self {
        self.models_default = models;
        self
    }

    pub fn with_analytics(mut self, reporter: Arc<dyn AnalyticsReporter>) -> Self {
        self.analytics = Some(reporter);
        self
    }

    pub fn with_provider(mut self, provider: Arc<dyn Provider>) -> Self {
        #[allow(deprecated)]
        {
            self.base_url = provider.base_url().to_string();
        }
        self.provider = provider;
        self
    }

    #[deprecated(since = "0.1.0", note = "Use with_provider instead")]
    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        let base_url_str = base_url.into();
        self.provider = Arc::new(OpenRouterProvider::new(base_url_str.clone()));
        #[allow(deprecated)]
        {
            self.base_url = base_url_str;
        }
        self
    }
}
