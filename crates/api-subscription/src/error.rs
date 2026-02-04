use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SubscriptionError>;

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
        let (status, message) = match &self {
            Self::Auth(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            Self::SupabaseRequest(msg) => {
                tracing::error!(error = %msg, "supabase_error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
            Self::Stripe(msg) => {
                tracing::error!(error = %msg, "stripe_error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Payment processing error".to_string(),
                )
            }
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal_error");
                (StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
        };
        (status, message).into_response()
    }
}
