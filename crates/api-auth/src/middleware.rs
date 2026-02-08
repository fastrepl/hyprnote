//! Authentication middleware for Axum.

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use hypr_supabase_auth::{Error as SupabaseAuthError, SupabaseAuth};

use crate::{error::AuthError, state::AuthState};

/// Axum middleware that requires authentication and entitlement verification.
///
/// This middleware:
/// 1. Extracts the bearer token from the Authorization header
/// 2. Validates the token with Supabase
/// 3. Verifies the user has the required entitlement
/// 4. Injects the claims into request extensions for downstream handlers
///
/// # Errors
///
/// Returns an [`AuthError`] if:
/// - The Authorization header is missing or invalid
/// - The token cannot be validated
/// - The user lacks the required entitlement
/// - JWKS fetching fails
///
/// # Example
///
/// ```no_run
/// use axum::{Router, routing::get, middleware};
/// use api_auth::{AuthState, require_auth};
///
/// async fn protected_route() -> &'static str {
///     "This is a protected route"
/// }
///
/// let state = AuthState::new("https://example.supabase.co", "hyprnote_pro");
///
/// let app = Router::new()
///     .route("/protected", get(protected_route))
///     .layer(middleware::from_fn_with_state(state.clone(), require_auth))
///     .with_state(state);
/// ```
pub async fn require_auth(
    State(state): State<AuthState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AuthError> {
    // Extract the Authorization header
    let auth_header = extract_auth_header(&request)?;

    // Extract the bearer token from the header
    let token = extract_bearer_token(auth_header)?;

    // Verify token and check entitlement
    let claims = state
        .inner
        .require_entitlement(token, &state.required_entitlement)
        .await?;

    // Store claims in request extensions for downstream handlers
    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}

/// Extracts the Authorization header from the request.
fn extract_auth_header(request: &Request) -> Result<&str, AuthError> {
    request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AuthError::from(SupabaseAuthError::MissingAuthHeader))
}

/// Extracts the bearer token from the Authorization header value.
fn extract_bearer_token(auth_header: &str) -> Result<&str, AuthError> {
    SupabaseAuth::extract_token(auth_header)
        .ok_or_else(|| AuthError::from(SupabaseAuthError::InvalidAuthHeader))
}
