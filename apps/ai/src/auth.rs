use std::collections::BTreeMap;

use axum::{extract::Request, middleware::Next, response::Response};

pub use hypr_api_auth::{AuthState, require_auth};
use hypr_api_auth::{Claims, DeviceFingerprint, UserId};

pub async fn sentry_and_analytics(mut request: Request, next: Next) -> Response {
    if let Some(claims) = request.extensions().get::<Claims>() {
        let device_fingerprint = request.extensions().get::<DeviceFingerprint>();

        sentry::configure_scope(|scope| {
            scope.set_user(Some(sentry::User {
                id: device_fingerprint.map(|f| f.0.clone()),
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
    }

    let fingerprint = request
        .extensions()
        .get::<DeviceFingerprint>()
        .map(|f| f.0.clone());
    let user_id = request.extensions().get::<UserId>().map(|u| u.0.clone());

    if let Some(fingerprint) = fingerprint {
        request
            .extensions_mut()
            .insert(hypr_analytics::DeviceFingerprint(fingerprint));
    }

    if let Some(user_id) = user_id {
        request
            .extensions_mut()
            .insert(hypr_analytics::AuthenticatedUserId(user_id));
    }

    next.run(request).await
}
