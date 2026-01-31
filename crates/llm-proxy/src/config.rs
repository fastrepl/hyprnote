use std::sync::{Arc, LazyLock};
use std::time::Duration;

use crate::analytics::AnalyticsReporter;
use crate::provider::{OpenRouterProvider, Provider};

const DEFAULT_TIMEOUT_MS: u64 = 120_000;
const DEFAULT_NUM_RETRIES: usize = 1;
const DEFAULT_MAX_DELAY_SECS: u64 = 2;

pub const FLAG_MODELS_TOOL_CALLING: &str = "llm-models-tool-calling";
pub const FLAG_MODELS_DEFAULT: &str = "llm-models-default";

pub static DEFAULT_MODELS_TOOL_CALLING: LazyLock<Vec<String>> = LazyLock::new(|| {
    vec![
        "moonshotai/kimi-k2-0905:exacto".into(),
        "anthropic/claude-haiku-4.5".into(),
        "openai/gpt-oss-120b:exacto".into(),
    ]
});

pub static DEFAULT_MODELS_DEFAULT: LazyLock<Vec<String>> = LazyLock::new(|| {
    vec![
        "moonshotai/kimi-k2-0905".into(),
        "openai/gpt-5.2-chat".into(),
    ]
});

#[derive(Clone)]
pub struct RetryConfig {
    pub num_retries: usize,
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

#[derive(Clone)]
pub struct LlmProxyConfig {
    pub api_key: String,
    pub timeout: Duration,
    pub analytics: Option<Arc<dyn AnalyticsReporter>>,
    pub provider: Arc<dyn Provider>,
    pub retry_config: RetryConfig,
    flag_client: Option<hypr_flag::FlagClient>,
}

impl LlmProxyConfig {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            timeout: Duration::from_millis(DEFAULT_TIMEOUT_MS),
            analytics: None,
            provider: Arc::new(OpenRouterProvider::default()),
            retry_config: RetryConfig::default(),
            flag_client: None,
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_analytics(mut self, reporter: Arc<dyn AnalyticsReporter>) -> Self {
        self.analytics = Some(reporter);
        self
    }

    pub fn with_provider(mut self, provider: Arc<dyn Provider>) -> Self {
        self.provider = provider;
        self
    }

    pub fn with_retry_config(mut self, retry_config: RetryConfig) -> Self {
        self.retry_config = retry_config;
        self
    }

    pub fn with_flag_client(mut self, flag_client: hypr_flag::FlagClient) -> Self {
        self.flag_client = Some(flag_client);
        self
    }

    pub async fn get_flag_payload<T: serde::de::DeserializeOwned + Clone>(
        &self,
        flag_key: &str,
        default: &T,
    ) -> T {
        let Some(client) = &self.flag_client else {
            return default.clone();
        };

        match client.get_flags("global", None).await {
            Ok(flags) => flags
                .get_payload_as::<T>(flag_key)
                .unwrap_or_else(|| default.clone()),
            Err(e) => {
                tracing::warn!(error = %e, flag_key = %flag_key, "get_flag_payload_failed");
                default.clone()
            }
        }
    }
}
