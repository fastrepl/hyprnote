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

impl From<stripe::StripeError> for SubscriptionError {
    fn from(err: stripe::StripeError) -> Self {
        Self::Stripe(err.to_string())
    }
}

impl IntoResponse for SubscriptionError {
    fn into_response(self) -> Response {
        let (status, error_code) = match &self {
            Self::Auth(_) => (StatusCode::UNAUTHORIZED, "unauthorized"),
            Self::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad_request"),
            Self::SupabaseRequest(msg) => {
                tracing::error!(error = %msg, "supabase_error");
                sentry::capture_message(msg, sentry::Level::Error);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_server_error")
            }
            Self::Stripe(msg) => {
                tracing::error!(error = %msg, "stripe_error");
                sentry::capture_message(msg, sentry::Level::Error);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "failed_to_create_subscription",
                )
            }
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "internal_error");
                sentry::capture_message(msg, sentry::Level::Error);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_server_error")
            }
        };

        let body = Json(ErrorResponse {
            error: error_code.to_string(),
        });

        (status, body).into_response()
    }
}
