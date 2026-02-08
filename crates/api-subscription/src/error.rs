use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SubscriptionError>;

#[derive(Debug, Serialize)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: ErrorDetails,
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

impl From<stripe::StripeError> for SubscriptionError {
    fn from(err: stripe::StripeError) -> Self {
        Self::Stripe(err.to_string())
    }
}

impl IntoResponse for SubscriptionError {
    fn into_response(self) -> Response {
        let internal_message = "Internal server error".to_string();

        let (status, code, message) = match self {
            Self::Auth(message) => (StatusCode::UNAUTHORIZED, "unauthorized", message),
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, "bad_request", message),
            Self::SupabaseRequest(message) => {
                tracing::error!(error = %message, "supabase_error");
                sentry::capture_message(&message, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "supabase_error",
                    internal_message,
                )
            }
            Self::Stripe(message) => {
                tracing::error!(error = %message, "stripe_error");
                sentry::capture_message(&message, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "stripe_error",
                    internal_message,
                )
            }
            Self::Internal(message) => {
                tracing::error!(error = %message, "internal_error");
                sentry::capture_message(&message, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_server_error",
                    internal_message,
                )
            }
        };

        let body = Json(ErrorResponse {
            error: ErrorDetails {
                code: code.to_string(),
                message,
            },
        });

        (status, body).into_response()
    }
}
