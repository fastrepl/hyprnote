use std::collections::BTreeMap;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use hypr_supabase_auth::{Error as SupabaseAuthError, SupabaseAuth};

const PRO_ENTITLEMENT: &str = "hyprnote_pro";
pub const DEVICE_FINGERPRINT_HEADER: &str = "x-device-fingerprint";

#[derive(Clone)]
pub struct AuthState {
    inner: SupabaseAuth,
}

impl AuthState {
    pub fn new(supabase_url: &str) -> Self {
        Self {
            inner: SupabaseAuth::new(supabase_url),
        }
    }
}

pub struct AuthError(SupabaseAuthError);

impl From<SupabaseAuthError> for AuthError {
    fn from(err: SupabaseAuthError) -> Self {
        Self(err)
    }
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
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

pub async fn require_pro(
    State(state): State<AuthState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AuthError> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(SupabaseAuthError::MissingAuthHeader)?;

    let device_fingerprint = request
        .headers()
        .get(DEVICE_FINGERPRINT_HEADER)
        .and_then(|h| h.to_str().ok())
        .map(String::from);

    let token =
        SupabaseAuth::extract_token(auth_header).ok_or(SupabaseAuthError::InvalidAuthHeader)?;

    let claims = state
        .inner
        .require_entitlement(token, PRO_ENTITLEMENT)
        .await?;

    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry::User {
            id: device_fingerprint.clone(),
            email: claims.email.clone(),
            username: Some(claims.sub.clone()),
            ..Default::default()
        }));
        scope.set_tag("user.id", &claims.sub);

        let mut ctx = BTreeMap::new();
        ctx.insert(
            "entitlements".into(),
            sentry::protocol::Value::Array(
                claims
                    .entitlements
                    .iter()
                    .map(|e| sentry::protocol::Value::String(e.clone()))
                    .collect(),
            ),
        );
        scope.set_context("user_claims", sentry::protocol::Context::Other(ctx));
    });

    if let Some(fingerprint) = device_fingerprint {
        request
            .extensions_mut()
            .insert(hypr_llm_proxy::DistinctId(fingerprint.clone()));
        request
            .extensions_mut()
            .insert(hypr_transcribe_proxy::DistinctId(fingerprint));
    }

    Ok(next.run(request).await)
}
