//! LLM proxy library for routing chat completion requests through different providers
//!
//! This library provides a unified interface for proxying LLM chat completion requests
//! to various providers like OpenRouter, with support for streaming, analytics, and retry logic.

mod analytics;
mod config;
mod env;
mod error;
mod handler;
mod openapi;
pub mod provider;
mod types;

pub use analytics::{AnalyticsReporter, GenerationEvent};
pub use config::*;
pub use env::{ApiKey, Env};
pub use error::{Error, ProviderError};
pub use handler::{chat_completions_router, router};
pub use hypr_analytics::{AuthenticatedUserId, DeviceFingerprint};
pub use openapi::openapi;
