use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
    Extension,
};

use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::state::{AnalyticsState, AuthState};

pub async fn for_api_key(
    State(state): State<AuthState>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    if cfg!(debug_assertions) {
        return Ok(next.run(req).await);
    }

    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let api_key = if let Some(api_key) = auth_header {
        api_key
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let user: hypr_db::admin::User = state
        .admin_db
        .get_user_by_device_api_key(api_key)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if true {
        req.extensions_mut().insert(user);
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

pub async fn for_analytics(
    Extension(user): Extension<hypr_db::admin::User>,
    State(state): State<AnalyticsState>,
    req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let payload = hypr_analytics::AnalyticsPayload::for_user(user.id.to_string())
        .event("test_event")
        .with("key1", "value1")
        .with("key2", 2)
        .build();

    let _ = state.analytics.event(payload).await;

    Ok(next.run(req).await)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LagoWebhookPayload {
    pub webhook_type: String,
    pub object_type: String,
    #[serde(flatten)]
    pub object: serde_json::Value,
}

// https://github.com/tokio-rs/axum/blob/28c6be7/examples/consume-body-in-extractor-or-middleware/src/main.rs#L1
pub async fn verify_lago(req: Request, next: middleware::Next) -> Result<Response, StatusCode> {
    let (parts, body) = req.into_parts();
    let headers = parts.headers.clone();

    let signature = headers
        .get("X-Lago-Signature")
        .ok_or(StatusCode::BAD_REQUEST)?
        .to_str()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let algorithm = headers
        .get("X-Lago-Signature-Algorithm")
        .ok_or(StatusCode::BAD_REQUEST)?
        .to_str()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    if algorithm != "hmac" {
        return Err(StatusCode::BAD_REQUEST);
    }

    let bytes = axum::body::to_bytes(body, usize::MAX)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let secret = std::env::var("LAGO_WEBHOOK_SECRET").unwrap();
    let mut mac: Hmac<Sha256> = Hmac::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(&bytes);
    mac.verify_slice(&hex::decode(signature).unwrap()).unwrap();

    let payload: LagoWebhookPayload = serde_json::from_slice(&bytes).unwrap();
    let mut req = axum::extract::Request::from_parts(parts, axum::body::Body::from(bytes));

    req.extensions_mut().insert(payload);
    Ok(next.run(req).await)
}
