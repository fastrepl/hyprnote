use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SubscriptionError>;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug, Error)]
pub enum SubscriptionError {
    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Supabase request failed: {0}")]
    SupabaseRequest(String),

    #[error("Stripe error: {0}")]
    Stripe(String),

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl SubscriptionError {
    /// Returns the HTTP status code for this error
    fn status_code(&self) -> StatusCode {
        match self {
            Self::Auth(_) => StatusCode::UNAUTHORIZED,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::SupabaseRequest(_) | Self::Stripe(_) | Self::Internal(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }
    }

    /// Returns the error code string for the API response
    fn error_code(&self) -> &str {
        match self {
            Self::Auth(_) => "unauthorized",
            Self::BadRequest(_) => "bad_request",
            Self::SupabaseRequest(_) => "internal_server_error",
            Self::Stripe(_) => "failed_to_create_subscription",
            Self::Internal(_) => "internal_server_error",
        }
    }

    /// Logs and reports the error to Sentry if it's an internal error
    fn report_if_internal(&self) {
        match self {
            Self::SupabaseRequest(msg) => {
                tracing::error!(error = %msg, "supabase_error");
                sentry::capture_message(msg, sentry::Level::Error);
            }
            Self::Stripe(msg) => {
                tracing::error!(error = %msg, "stripe_error");
                sentry::capture_message(msg, sentry::Level::Error);
            }
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal_error");
                sentry::capture_message(msg, sentry::Level::Error);
            }
            _ => {}
        }
    }
}

impl From<hypr_supabase_auth::Error> for SubscriptionError {
    fn from(err: hypr_supabase_auth::Error) -> Self {
        Self::Auth(err.to_string())
    }
}

impl From<stripe::StripeError> for SubscriptionError {
    fn from(err: stripe::StripeError) -> Self {
        Self::Stripe(err.to_string())
    }
}

impl IntoResponse for SubscriptionError {
    fn into_response(self) -> Response {
        self.report_if_internal();

        let status = self.status_code();
        let error_code = self.error_code();

        let body = Json(ErrorResponse {
            error: error_code.to_string(),
        });

        (status, body).into_response()
    }
}
