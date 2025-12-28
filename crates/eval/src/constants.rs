//! Constants used throughout the eval system.

/// Default models for evaluation
pub const DEFAULT_MODELS: &[&str] = &[
    "openai/gpt-4.1-nano",
    "anthropic/claude-haiku-4.5",
    "liquid/lfm-2.2-6b",
];

/// Default model used for LLM-based grading
pub const DEFAULT_GRADER_MODEL: &str = "openai/gpt-4.1-nano";

/// Default temperature for LLM requests
pub const DEFAULT_TEMPERATURE: f64 = 0.2;

/// Default retry interval in milliseconds
pub const DEFAULT_RETRY_INTERVAL_MS: u64 = 500;

/// Default timeout in seconds
pub const DEFAULT_TIMEOUT_SECONDS: u64 = 60;

/// Default concurrency level
pub const DEFAULT_CONCURRENCY: usize = 4;

/// Model cache duration in seconds
pub const MODEL_CACHE_DURATION_SECS: u64 = 300;

/// Pass rate threshold for multi-sample grading
pub const PASS_RATE_THRESHOLD: f64 = 0.5;

/// Confidence level for statistical calculations
pub const CONFIDENCE_LEVEL: f64 = 0.95;

/// OpenRouter API base URL
pub const OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1";
