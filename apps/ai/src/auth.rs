//! Authentication and user context middleware.
//!
//! This module provides middleware for:
//! - JWT-based authentication via Supabase
//! - Device fingerprint extraction for analytics
//! - User context injection into Sentry for error tracking

use std::collections::BTreeMap;

use axum::{extract::Request, middleware::Next, response::Response};

use hypr_api_auth::Claims;
pub use hypr_api_auth::{AuthState, require_auth};

use crate::constants::DEVICE_FINGERPRINT_HEADER;

/// Middleware that extracts user authentication and device information,
/// then configures Sentry scope and analytics context.
///
/// This middleware should run after authentication but before request handlers.
///
/// # Context Extraction
///
/// - Extracts device fingerprint from `x-device-fingerprint` header
/// - Extracts user claims from request extensions (set by `require_auth`)
/// - Injects `AuthenticatedUserId` and `DeviceFingerprint` into request extensions
///
/// # Sentry Integration
///
/// Configures Sentry scope with:
/// - User ID, email, and username from JWT claims
/// - Device fingerprint as user ID
/// - Entitlements as context for debugging
pub async fn sentry_and_analytics(mut request: Request, next: Next) -> Response {
    let device_fingerprint = request
        .headers()
        .get(DEVICE_FINGERPRINT_HEADER)
        .and_then(|h| h.to_str().ok())
        .map(String::from);

    if let Some(claims) = request.extensions().get::<Claims>() {
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

        let user_id = claims.sub.clone();
        request
            .extensions_mut()
            .insert(hypr_analytics::AuthenticatedUserId(user_id));
    }

    if let Some(fingerprint) = device_fingerprint {
        request
            .extensions_mut()
            .insert(hypr_analytics::DeviceFingerprint(fingerprint));
    }

    next.run(request).await
}
