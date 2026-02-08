use axum::http::HeaderMap;

use crate::error::{Result, SubscriptionError};

/// Extracts the bearer token from the Authorization header
pub fn extract_token(headers: &HeaderMap) -> Result<&str> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| SubscriptionError::Auth("Missing Authorization header".to_string()))?;

    hypr_supabase_auth::SupabaseAuth::extract_token(auth_header)
        .ok_or_else(|| SubscriptionError::Auth("Invalid Authorization header".to_string()))
}
