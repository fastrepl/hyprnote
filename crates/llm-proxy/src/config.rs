use std::sync::Arc;
use std::time::Duration;

use crate::analytics::AnalyticsReporter;

const DEFAULT_TIMEOUT_MS: u64 = 120_000;

#[derive(Clone)]
pub struct LlmProxyConfig {
    pub api_key: String,
    pub timeout: Duration,
    pub models_tool_calling: Vec<String>,
    pub models_default: Vec<String>,
    pub analytics: Option<Arc<dyn AnalyticsReporter>>,
}

impl LlmProxyConfig {
    pub fn new(api_key: impl Into<String>) -> Self {
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
}
