//! Configuration management for the STT proxy
//!
//! This module handles all configuration aspects including environment variables,
//! API keys, and proxy settings.

mod env;
mod proxy;

pub use env::{ApiKeys, Env};
pub use proxy::{DEFAULT_CONNECT_TIMEOUT_MS, SttProxyConfig};
