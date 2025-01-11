use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
    Extension,
};

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
