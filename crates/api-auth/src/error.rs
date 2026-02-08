//! Error types for API authentication.

use axum::{http::StatusCode, response::IntoResponse};
use hypr_supabase_auth::Error as SupabaseAuthError;

/// Authentication error wrapper.
///
/// This type wraps errors from the underlying Supabase authentication
/// and provides HTTP response conversion for Axum handlers.
#[derive(Debug)]
pub struct AuthError(SupabaseAuthError);

impl From<SupabaseAuthError> for AuthError {
    fn from(err: SupabaseAuthError) -> Self {
        Self(err)
    }
}

impl IntoResponse for AuthError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self.0 {
            SupabaseAuthError::MissingAuthHeader => {
                (StatusCode::UNAUTHORIZED, "missing_authorization_header")
            }
            SupabaseAuthError::InvalidAuthHeader => {
                (StatusCode::UNAUTHORIZED, "invalid_authorization_header")
            }
            SupabaseAuthError::JwksFetchFailed => {
                (StatusCode::INTERNAL_SERVER_ERROR, "jwks_fetch_failed")
            }
            SupabaseAuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "invalid_token"),
            SupabaseAuthError::MissingEntitlement(_) => {
                (StatusCode::FORBIDDEN, "subscription_required")
            }
        };
        (status, message).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missing_header_response() {
        let err = AuthError(SupabaseAuthError::MissingAuthHeader);
        let response = err.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_invalid_header_response() {
        let err = AuthError(SupabaseAuthError::InvalidAuthHeader);
        let response = err.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_jwks_fetch_failed_response() {
        let err = AuthError(SupabaseAuthError::JwksFetchFailed);
        let response = err.into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn test_invalid_token_response() {
        let err = AuthError(SupabaseAuthError::InvalidToken);
        let response = err.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_missing_entitlement_response() {
        let err = AuthError(SupabaseAuthError::MissingEntitlement("pro".to_string()));
        let response = err.into_response();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
