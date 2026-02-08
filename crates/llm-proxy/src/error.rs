use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

/// Main error type for the LLM proxy library
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Error occurred during upstream provider request
    #[error("Upstream request failed: {0}")]
    UpstreamRequest(#[from] reqwest::Error),

    /// Request to upstream provider timed out
    #[error("Request timeout")]
    Timeout,

    /// Failed to read response body from upstream
    #[error("Failed to read response body: {0}")]
    BodyRead(String),

    /// Failed to build provider request
    #[error("Failed to build provider request: {0}")]
    InvalidRequest(#[from] ProviderError),
}

/// Errors that can occur when working with providers
#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("Failed to serialize request: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Failed to parse response: {0}")]
    ParseError(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::UpstreamRequest(e) => {
                let status_code = e.status().map(|s| s.as_u16());
                let is_timeout = e.is_timeout();
                let is_connect = e.is_connect();

                tracing::error!(
                    error = %e,
                    upstream_status = ?status_code,
                    is_timeout = %is_timeout,
                    is_connect = %is_connect,
                    "upstream_request_failed"
                );

                sentry::configure_scope(|scope| {
                    if let Some(code) = status_code {
                        scope.set_tag("upstream.status", code.to_string());
                    }
                });

                (StatusCode::BAD_GATEWAY, e.to_string())
            }
            Self::Timeout => {
                tracing::error!("upstream_request_timeout");
                sentry::configure_scope(|scope| {
                    scope.set_tag("upstream.status", "timeout");
                });
                (StatusCode::GATEWAY_TIMEOUT, "Request timeout".to_string())
            }
            Self::BodyRead(e) => {
                tracing::error!(error = %e, "response_body_read_failed");
                sentry::configure_scope(|scope| {
                    scope.set_tag("upstream.status", "body_read_failed");
                });
                (
                    StatusCode::BAD_GATEWAY,
                    "Failed to read response".to_string(),
                )
            }
            Self::InvalidRequest(e) => {
                tracing::error!(error = %e, "failed_to_build_provider_request");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Invalid request".to_string(),
                )
            }
        };

        (status, message).into_response()
    }
}

/// Check if an error is retryable
pub(crate) fn is_retryable(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect()
}
