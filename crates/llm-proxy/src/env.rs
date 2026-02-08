//! Environment configuration

use serde::Deserialize;

/// Environment variables for the LLM proxy
#[derive(Deserialize)]
pub struct Env {
    /// OpenRouter API key
    pub openrouter_api_key: String,
}

/// Wrapper type for API keys with convenient From implementations
pub struct ApiKey(pub String);

impl From<&Env> for ApiKey {
    fn from(env: &Env) -> Self {
        Self(env.openrouter_api_key.clone())
    }
}

impl From<&str> for ApiKey {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

impl From<String> for ApiKey {
    fn from(s: String) -> Self {
        Self(s)
    }
}
