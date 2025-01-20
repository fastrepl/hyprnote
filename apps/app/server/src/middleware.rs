use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
    Extension,
};
use clerk_rs::validators::authorizer::ClerkJwt;

use crate::{
    get_env,
    state::{AnalyticsState, AuthState},
};

pub async fn verify_api_key(
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

    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

pub async fn attach_user_from_clerk(
    State(state): State<AuthState>,
    Extension(jwt): Extension<ClerkJwt>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let clerk_user_id = jwt.sub;

    let user = state
        .admin_db
        .get_user_by_clerk_user_id(clerk_user_id)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

pub async fn attach_user_db(
    Extension(user): Extension<hypr_db::admin::User>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let token = get_env("TURSO_API_KEY");
    let url = format!("{}-yujonglee.turso.io", user.turso_db_name);
    let conn = hypr_db::ConnectionBuilder::new()
        .remote(url, token)
        .connect()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let db = hypr_db::user::UserDatabase::from(conn);

    req.extensions_mut().insert(db);
    Ok(next.run(req).await)
}

pub async fn send_analytics(
    Extension(user): Extension<hypr_db::admin::User>,
    State(state): State<AnalyticsState>,
    req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let payload = hypr_analytics::AnalyticsPayload::for_user(user.id.to_string())
        .event("test_event")
        .with("url", req.uri().path().to_string())
        .build();

    let _ = state.analytics.event(payload).await;

    Ok(next.run(req).await)
}
