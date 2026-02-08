//! Environment configuration management.
//!
//! This module handles loading and parsing environment variables using the
//! `envy` crate for automatic deserialization. Configuration is loaded once
//! at startup and cached for the lifetime of the application.
//!
//! # Environment Variables
//!
//! - `PORT`: HTTP server port (default: 3001)
//! - `SENTRY_DSN`: Optional Sentry DSN URL for error tracking
//! - `POSTHOG_API_KEY`: Optional PostHog API key for analytics
//! - `SUPABASE_URL`: Supabase project URL for authentication
//! - Additional variables for LLM and STT proxy configuration (see respective crates)

use std::path::Path;
use std::sync::OnceLock;

use serde::Deserialize;

use crate::constants::DEFAULT_PORT;

/// Returns the default server port.
fn default_port() -> u16 {
    DEFAULT_PORT
}

/// Deserializer that filters out empty strings, treating them as None.
///
/// This is useful for optional environment variables where an empty string
/// should be treated the same as an unset variable.
fn filter_empty<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    Ok(s.filter(|s| !s.is_empty()))
}

/// Application environment configuration.
///
/// This struct aggregates configuration from multiple sources:
/// - Direct fields for this service
/// - Flattened LLM proxy configuration
/// - Flattened STT proxy configuration
#[derive(Deserialize)]
pub struct Env {
    /// HTTP server port (default: 3001)
    #[serde(default = "default_port")]
    pub port: u16,

    /// Optional Sentry DSN for error tracking and performance monitoring
    #[serde(default, deserialize_with = "filter_empty")]
    pub sentry_dsn: Option<String>,

    /// Optional PostHog API key for analytics
    #[serde(default, deserialize_with = "filter_empty")]
    pub posthog_api_key: Option<String>,

    /// Supabase project URL for JWT authentication
    pub supabase_url: String,

    /// LLM proxy configuration (flattened from hypr-llm-proxy)
    #[serde(flatten)]
    pub llm: hypr_llm_proxy::Env,

    /// STT proxy configuration (flattened from hypr-transcribe-proxy)
    #[serde(flatten)]
    pub stt: hypr_transcribe_proxy::Env,
}

/// Static storage for the application environment configuration.
static ENV: OnceLock<Env> = OnceLock::new();

/// Returns a reference to the global environment configuration.
///
/// This function lazily loads the environment on first call, then caches it
/// for subsequent calls. Environment is loaded from:
/// 1. `.env` file in the crate root (if present)
/// 2. System environment variables
///
/// # Panics
///
/// Panics if environment variables are missing or malformed.
pub fn env() -> &'static Env {
    ENV.get_or_init(|| {
        let _ = dotenvy::from_path(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));
        envy::from_env().expect("Failed to load environment")
    })
}
