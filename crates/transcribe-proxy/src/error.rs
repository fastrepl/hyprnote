//! Error types used throughout the transcribe-proxy library
//!
//! This module defines all error types that can occur during proxy operations,
//! including connection errors, provider selection errors, and upstream errors.

/// Errors that can occur during WebSocket proxy operations
#[derive(Debug, thiserror::Error)]
pub enum ProxyError {
    #[error("invalid upstream request: {0}")]
    InvalidRequest(String),
    #[error("upstream connection failed: {0}")]
    ConnectionFailed(String),
    #[error("upstream connection timeout")]
    ConnectionTimeout,
}

/// Errors that can occur during provider selection
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum ProviderSelectionError {
    #[error("provider {0:?} is not available")]
    ProviderNotAvailable(Provider),
}

// Re-export for backward compatibility
#[deprecated(since = "0.1.0", note = "Use `ProviderSelectionError` instead")]
pub type SelectionError = ProviderSelectionError;
